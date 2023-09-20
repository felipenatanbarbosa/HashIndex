const Reader           = require('./repo/reader.js')
const PartitionModule  = require('./repo/partition.js')
const { make_phrase }  = require('./hash/Hash.js')
const BucketRepository = require('./hash/BucketRepository.js')
const vorpal  = require('vorpal')()
const express = require('express')






// Reader.readFile((async lines => {
//   const page_size = 800, bucket_size = 450
//   const { paginated_data: partitioned_text, total_elements } = PartitionModule.make_partition(lines, { page_size })
//   const max_buckets  = Math.ceil(total_elements / bucket_size)
//   const bucket_repo  = new BucketRepository(bucket_size)

//   for(let index = 1; index <= max_buckets; index++) {
//     await bucket_repo.create_bucket(index)
//   }

//   for(const page_id in partitioned_text) {
//     const current_page = partitioned_text[page_id]
//     for(const word of current_page) {
//       const hash_phrase = make_phrase(word, { max: max_buckets })
//       await bucket_repo.append(hash_phrase, { [word]: page_id })
//     }
//   }
// }))