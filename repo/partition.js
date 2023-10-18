const PartitionModule = {
  make_partition: (elements, { page_size = 50 } = {}) => {
    const paginated_data = {}
    const current = {
      page: 1,
      lines: []
    }
    for(let index = 0; index < elements.length; index++) {
      current.lines.push(elements[index])
      if(current.lines.length == page_size) {
        paginated_data[current.page] = current.lines
        current.page  = current.page + 1
        current.lines = []
      }

      if(index == current.lines.length - 1 && current.lines.length) {
        paginated_data[current.page] = current.lines
      }
    }
    return { partitioned_text: paginated_data, total_elements: elements.length }
  }
}

module.exports = PartitionModule