const { Level } = require('level')

class TransactionlessDatabase {
  constructor() {
    if(Database.instance) return Database.instance
    this.db = new Level('cache', { valueEncoding: 'json' })
    Database.instance = this
  }
  async save_bucket(bucket_id, meta, elements = {}) {
    return await this.db.put(bucket_id, { elements, meta, childs: [] })
  }
  async set_child(bucket_id, child_id) {
    const [bucket_key, _] = bucket_id.toString().split(':')
    const bucket = await this.take.content(bucket_key)
    bucket.childs.push(child_id)
    bucket.meta.last = child_id
    await this.db.put(bucket_key, bucket)
    await this.save_bucket(child_id)
  }
  async pour(bucket_id, element) {
    const bucket = await this.take.content(bucket_id)
    bucket.elements = Object.assign(bucket.elements, element)
    return await this.db.put(bucket_id, bucket)
  }
  async search(bucket_id, key) {
    const { elements, ...bucket } = await this.take.content(bucket_id)
    if(elements[key]) return elements[key]
    for(const collision_key of bucket) {
      const current_bucket = await this.take.content(collision_key)
      if(current_bucket.elements[key]) return current_bucket.elements[key]
    }
  }
  take = {
    content: async bucket_id => {
      const [bucket_key, collision_key] = bucket_id.toString().split(':')
      if(!collision_key) return await this.db.get(bucket_id) //case parent
      const { meta }     = await this.db.get(bucket_key)
      const { elements } = await this.db.get(bucket_id)
      return { elements, meta } //case child
    },
    meta: async () => {
      const bucket = await this.db.get('2')
      console.log(bucket)
      return bucket
    },
    all_children: async bucket_id => {
      const bucket     = await this.take.content(bucket_id)
      const { childs } = bucket
      const buckets    = { [bucket_id]: bucket }
      if(!childs.length) return buckets
      for(const collision_key of childs) buckets[collision_key] = await this.take.content(collision_key)
      return buckets
    },
    last: async bucket_id => {
      const { meta } = await this.take.content(bucket_id).catch(console.log)
      if(!meta) return
      return await this.take.content(meta.last)
    },
  }
  data = {
    save_text_batched: async partitioned_text => {
      const transactions = []
      for(const page_id in partitioned_text) {
        const page_elements = partitioned_text[page_id]
        transactions.push({
          type: 'put',
          key: page_id,
          value: page_elements
        })
      }
      return await this.db.batch(transactions)
    },
    save: async (key, value) => await this.db.put(key, value),
    get: async   key         => await this.db.get(key)
  }
}

module.exports = TransactionlessDatabase