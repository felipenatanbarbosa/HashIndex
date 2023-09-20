const { Level } = require('level')

class Database {
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
    const { elements } = await this.take.content(bucket_id)
    const page_id = elements[key]
  }
  take = {
    content: async bucket_id => {
      bucket_id = bucket_id.toString()
      const [bucket_key, collision_key] = bucket_id.split(':')
      if(!collision_key) return await this.db.get(bucket_id) //case parent
      const { meta }     = await this.db.get(bucket_key)
      const { elements } = await this.db.get(bucket_id)
      return { elements, meta } //case child
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
      const { meta } = await this.take.content(bucket_id).catch()
      if(!meta) return
      return await this.take.content(meta.last)
    }
  }
}

module.exports = Database