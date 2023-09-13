const { Level } = require('level')

class Database {
  constructor() {
    if(Database.instance) return Database.instance
    this.db = new Level('/cache', { valueEncoding: 'json' })
    Database.instance = this
  }
  async save_bucket(bucket_id, meta, elements = {}) {
    return await this.db.put(bucket_id, { meta, elements })
  }
  async set_child(bucket_id, child_id) {
    const current_bucket = await this.take.head(bucket_id)
    await this.save_bucket(child_id, { child: null, last: child_id, size: current_bucket.meta.size })
    const updated_meta = {
      ...current_bucket.meta,
      child: current_bucket.child || child_id,
      last:  child_id
    }
    await this.db.put(bucket_id, { meta: updated_meta, elements: current_bucket.elements })
  }
  async pour(bucket_id, element) {
    const bucket = await this.take.head(bucket_id)
    bucket.elements = Object.assign(bucket.elements, element)
    return await this.db.put(bucket_id, bucket)
  }
  take = {
    head: async bucket_id => {
      return await this.db.get(bucket_id)
    },
    all_children: async bucket_id => {
      let current_bucket = await this.take.head(bucket_id)
      let buckets = []
      while(current_bucket) {
        buckets.push(current_bucket)
        if(!current_bucket.meta.child) break
        current_bucket = await this.take.head(current_bucket.meta.child)
      }
      return buckets
    },
    last: async bucket_id => {
      const bucket = await this.take.head(bucket_id)
      return await this.db.get(bucket.meta.last)
    }
  }
}

module.exports = Database