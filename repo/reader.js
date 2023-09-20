const fs = require('fs')

const Reader = {
  readFile: callback => {
    fs.readFile('words.txt', 'utf-8', (err, data) => {
      const lines = data.split('\n') 
      return callback(lines)
    })
  },
  readPages: () => {
    
  }
}

module.exports = Reader