const fs = require('fs')

module.exports = {
  reader: callback => {
    fs.readFile('words.txt', 'utf-8', (err, data) => {
      const lines = data.split('\n') 
      return callback(lines)
    })
  }
}