module.exports = {
  make_phrase: (word, { max }) => {
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i)
      hash = (hash * 31 + char) % (max - 1) + 1
    }
    return hash.toString()
  }
}