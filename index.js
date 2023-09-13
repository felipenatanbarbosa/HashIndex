const { reader } = require('./repo/reader.js')
const vorpal     = require('vorpal')()
const PartitionModule = require('./repo/partition.js')
const BucketRepository = require('./hash/BucketRepository.js')

reader((async lines => {
  // const partitionedText = PartitionModule.make_partition(lines, { page_size: 50 })
  // console.log(partitionedText)

  const repo = new BucketRepository(2)
  await repo.create_bucket('8324', { 'element1': 'value1' })
  await repo.append('8324', { 'element2': 'value2' })
  await repo.append('8324', { 'element3': 'value3' })
  await repo.append('8324', { 'element4': 'value4' })


  console.log(await repo.get_buckets(8324))
}))