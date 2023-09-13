const Database = require("../adapter/Database")

class BucketRepository extends Database {
  constructor(size) {
    super()
    this.size = size
  }
  __bucket_model = {
    bucket_id: '', //bucket_id must be the key, and the other objects should be values of this object
    //[bucket_id, child_id] = ['123', '123:c1' || '123:c2']
    meta: {
      child: undefined,
      last: '', //if first, put bucket_id
      size: '' //fixed size
    },
    elements: {}, //[name]: page_id
  } 
  async create_bucket(bucket_id, elements) {
    const meta = {
      child: null,
      last: bucket_id,
      size: this.size
    }
    await this.save_bucket(bucket_id, meta, elements)
  }
  async append(bucket_id, element) {
    const bucket = await this.take.head(bucket_id)
    if((bucket_id != bucket.meta.last) || (bucket.meta.size == Object.keys(bucket.elements).length)) return this._handle_colision(bucket.meta.last, element)
    console.log('bucket poured!')
    await this.pour(bucket_id, element)
  }
  async _handle_colision(bucket_id, element) {
    let child_id
    const [bucket_key, collision_key] = bucket_id.split(':')
    if(collision_key) child_id = `${bucket_key}:${+collision_key + 1}`
    child_id = `${bucket_key}:1`
    await this.set_child(bucket_id, child_id)
    await this.pour(child_id, element)
  }
  async get_buckets(bucket_id) {
    return await this.take.all_children(bucket_id)
  }
}
module.exports = BucketRepository