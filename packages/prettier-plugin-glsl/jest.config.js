module.exports = {
  testPathIgnorePatterns: [".idea", "lib", "coverage"],
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      diagnostics: false,
    },
  },
  verbose: false,
}
