const { Level } = require('level')

class Database {
  constructor() {
    if(Database.instance) return Database.instance
    this.db = new Level('cache', { valueEncoding: 'json' })
    Database.instance = this
  }
  make_transaction(transaction) {
    transaction.get_workspace = bucket_id => transaction.operations[bucket_id].value
    transaction.commit = async ()  => {
      await this.db.batch(Object.values(transaction.operations))
      transaction.operations = {}
    }
    transaction.push_operation = operation => {
      transaction.operations = {
        ...transaction.operations,
        [operation.key]: { ...operation }
      }
    }
    transaction.get_last = bucket_id => {
      const { meta } = transaction.get_workspace(bucket_id)
      return transaction.get_workspace(meta.last)
    }
    transaction.operations = []
  }
  store_bucket(bucket_id, meta, elements = {}, { transaction }) {
    transaction.operations = {
      ...transaction.operations,
      [bucket_id]: {
        type: 'put',
        key: bucket_id,
        value: { elements, meta, childs: [] }
      }
    }
  }
  pour(bucket_id, element, { transaction }) {
    const working_bucket = transaction.get_workspace(bucket_id)
    working_bucket.elements = Object.assign(working_bucket.elements, element)
  }
  set_child(bucket_id, child_id, { transaction }) {
    const [bucket_key, _] = bucket_id.toString().split(':')
    const working_bucket = transaction.get_workspace(bucket_key)
    working_bucket.childs.push(child_id)
    working_bucket.meta.last = child_id
    this.store_bucket(child_id, { ...working_bucket.meta, last: child_id }, undefined, { transaction })
  }
  db_operations = {
    get_meta: async () => {
      const { meta } = await this.db.get('1')
      return meta
    },
    from_db: async key => {
      return await this.db.get(key)
    }
  }
  async find(bucket_id, word) {
    const { elements, childs } = await this.db.get(bucket_id)
    if(elements[word]) return { page_id: elements[word], node_count: 0 }
    let node_count = 0
    for(const collision_id of childs) {
      const current_bucket = await this.db.get(collision_id)
      node_count++
      if(!current_bucket.elements[word]) continue
      return { page_id: current_bucket.elements[word], node_count }
    }
    return {}
  }
}

module.exports = Database