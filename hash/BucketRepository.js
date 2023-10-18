const Database = require("../adapter/Database")

class BucketRepository extends Database {
  constructor(size) {
    super()
    this.size          = size
    this.bucket_ref    = undefined
    this.bucket_id_ref = undefined
    this.transaction   = {}
    this.make_transaction(this.transaction)
  }
  create_bucket(bucket_id, element) {
    const meta = {
      last: bucket_id,
      size: this.size
    }
    this.store_bucket(bucket_id, meta, element, { transaction: this.transaction })
  }
  run_metrics(metrics_callback) {
    const { bucket_ref } = this
    const current_bucket_size = Object.keys(bucket_ref.elements).length 
    if(bucket_ref.meta.size == current_bucket_size)   return metrics_callback('overflow')
    if(bucket_ref.meta.last.toString().split(':')[1]) return metrics_callback('collision')
  }
  append(bucket_id, element, { metrics_callback } = {}) {
    this.bucket_ref = this.transaction.get_last(bucket_id)
    this.bucket_id_ref = this.bucket_ref.meta.last
    this.run_metrics(metrics_callback)
    if(this.bucket_ref.meta.size == Object.keys(this.bucket_ref.elements).length) return this.handle_overflow(element)
    this.pour(this.bucket_id_ref, element, { transaction: this.transaction })
  }
  handle_overflow(element) {
    const child_id = this.generate_child_id()
    this.set_child(this.bucket_id_ref, child_id, { transaction: this.transaction })
    this.pour(child_id, element, { transaction: this.transaction })
  }
  generate_child_id() {
    const { bucket_id_ref } = this
    const [bucket_key, collision_key] = bucket_id_ref.toString().split(':')
    return collision_key ? `${bucket_key}:${+collision_key + 1}` : `${bucket_key}:1`
  }
}
module.exports = BucketRepository 