const { readFileSync } = require("fs")

module.exports = {
  process(sourceText, sourcePath) {
    return {
      code: `module.exports = ${JSON.stringify(sourceText)};`,
    }
  },
}
