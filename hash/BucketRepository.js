const Database = require("../adapter/Database")

class BucketRepository extends Database {
  constructor(size) {
    super()
    this.size          = size
    this.bucket_ref    = undefined
    this.bucket_id_ref = undefined
  }
  async create_bucket(bucket_id, element) {
    const meta = {
      last: bucket_id,
      size: this.size
    }
    await this.save_bucket(bucket_id, meta, element)
    console.log(`creating bucket ${bucket_id}`)
  }
  async append(bucket_id, element, { create_if_null } = {}) {
    this.bucket_ref = await this.take.last(bucket_id)
    if(!this.bucket_ref && create_if_null) return await this.create_bucket(bucket_id, element)
    this.bucket_id_ref = this.bucket_ref.meta.last
    if(this.bucket_ref.meta.size == Object.keys(this.bucket_ref.elements).length) return await this._handle_overflow(element)
    await this.pour(this.bucket_id_ref, element)
  }
  async _handle_overflow(element) {
    const child_id = this.generate_child_id()
    console.error(`[COLLISION] - collision ocurred in ${child_id}`)
    await this.set_child(this.bucket_id_ref, child_id)
    await this.pour(child_id, element)
  }
  generate_child_id() {
    const { bucket_id_ref } = this
    const [bucket_key, collision_key] = bucket_id_ref.toString().split(':')
    return collision_key ? `${bucket_key}:${+collision_key + 1}` : `${bucket_key}:1`
  }
  async get_buckets(bucket_id) {
    return await this.take.all_children(bucket_id)
  }
}
module.exports = BucketRepository 