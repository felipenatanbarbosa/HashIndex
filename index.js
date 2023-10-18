const Reader           = require('./repo/reader.js')
const PartitionModule  = require('./repo/partition.js')
const { make_phrase }  = require('./hash/Hash.js')
const BucketRepository = require('./hash/BucketRepository.js')
const vorpal  = require('vorpal')()
const express = require('express')
const Database = require('./adapter/Database.js')
const TransactionlessDatabase = require('./adapter/TransactionlessDatabase.js')

let bucket_repo
const metrics_transaction = {
  collisions: 0,
  overflows: 0,
  open: operator => {
    return {
      'collision': () => metrics_transaction.collisions++,
      'overflow': () => {
        metrics_transaction.collisions++
        metrics_transaction.overflows++
      }
    }[operator]()
  },
  commit: async (transaction, objects) => {
    const { collisions, overflows } = metrics_transaction
    transaction.push_operation({ type: 'put', key: 'metrics', value: { collisions, overflows } })
    for(const key of Object.keys(objects)) transaction.push_operation({ type: 'put', key, value: objects[key] })
    await transaction.commit()
    console.log(`commited transaction for collisions: ${collisions} overflows: ${overflows}`)
  }
}

const modules = {
  create_buckets: (max_buckets) => {
    console.log('Creating buckets...')
    for(let index = 1; index <= max_buckets; index++) {
      console.log(`creating bucket ${index}`)
      bucket_repo.create_bucket(index)
    }
  },
}

vorpal
  .command('test')
  .action(async (args, callback) => {
    bucket_repo = new BucketRepository(1)
    bucket_repo.create_bucket('1')
    bucket_repo.append('1', {element1: 'value1'}, { metrics_callback: () => {} })
    bucket_repo.append('1', {element2: 'value2'}, { metrics_callback: () => {} })
    bucket_repo.append('1', {element3: 'value3'}, { metrics_callback: () => {} })
    bucket_repo.append('1', {element4: 'value4'}, { metrics_callback: () => {} })

    metrics_transaction.commit(bucket_repo.transaction, '')
    
  })

vorpal
  .command('populate')
  .option('--bucket-size <number>', 'specify bucket size')
  .option('--page-size <number>', 'specify page size')
  .action(async (args, callback) => {
    const { options } = args
    const page_size   = options?.['page-size']     || 500
    const bucket_size = options?.['bucket-size']   || 900
    Reader.readFile(async lines => {
      const { partitioned_text, total_elements } = PartitionModule.make_partition(lines, { page_size })
      const max_buckets = Math.ceil(total_elements / bucket_size)
      bucket_repo = new BucketRepository(bucket_size)
     
      modules.create_buckets(max_buckets) 

      for(const page_id in partitioned_text) {
        for(const word of partitioned_text[page_id]) {
          const hash_phrase = make_phrase(word, { max: max_buckets })
          bucket_repo.append(
            hash_phrase, 
            { [word]: page_id }, 
            { metrics_callback: metrics_transaction.open }
          )
          console.log(`inserting ${word} \n collisions: ${metrics_transaction.collisions} \n overflows: ${metrics_transaction.overflows}`)
        }
      }
      const collision_rate = ((metrics_transaction.collisions/total_elements) * 100).toFixed(2)
      const overflow_rate   = ((metrics_transaction.overflows/total_elements) * 100).toFixed(2)
      console.log(`overflow rate: ${overflow_rate}%\ncollision rate: ${collision_rate}%`)
      await metrics_transaction.commit(bucket_repo.transaction, { 
        text: partitioned_text, 
        max_buckets,
        bucket_size,
        page_size,
        rates: { 
          collision_count: metrics_transaction.collisions, 
          overflow_count: metrics_transaction.overflows,
          collision_rate, 
          overflow_rate, 
        } 
      })
    })
    callback()
  })

vorpal
  .command('find')
  .option('--word <string>', 'specify word to be searched')
  .action(async (args, callback) => {
    const { word }       = args.options
    const db_instance    = new Database()
    await db_instance.db.open()
    const max            = await db_instance.db_operations.from_db('max_buckets')
    const paginated_text = await db_instance.db_operations.from_db('text')
    const hash_phrase    = make_phrase(word, { max })
    const { page_id, node_count } = await db_instance.find(hash_phrase, word)
    if(!page_id) return console.log(`word '${word}' not found`)
    const matched_page   = paginated_text[page_id]
    const matched_word   = matched_page.find(c_word => c_word == word)

    const common_result = {
      search_word: matched_word,
      page: page_id,
      bucket_id: hash_phrase,
      total_iterations: matched_page.indexOf(matched_word) + 1
    }
    const child_result = {
      node_count,
      final_bucket_id: `${hash_phrase}:${node_count}`
    }
    console.table(common_result)
    if(node_count) console.table(child_result)
    await db_instance.db.close()
    callback()
  })

vorpal
  .command('db')
  .option('--key <string>', 'get specified key from database')
  .option('--fallback <string>', 'fallback value for specified key')
  .option('--clear', 'clears the database')
  .action(async (args, callback) => { //rates
    const { key, clear, fallback } = args.options
    const db_instance = new Database()
    await db_instance.db.open()
    if(clear) return db_instance.db.clear().then(() => {
      db_instance.db.close()
      console.log('OK \n please, restart application')
    })
    const values = await db_instance.db_operations.from_db(key)
    if(values[fallback]) {
      console.log(values[fallback])
    } else {
      console.log(values)
    }
    await db_instance.db.close()
    callback()
  })

vorpal
  .command('clear')
  .action((_, callback) => {
    console.clear()
    callback()
  })

vorpal.delimiter('HashIndex $ ').show()