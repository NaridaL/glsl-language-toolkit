module.exports = {
  testPathIgnorePatterns: [".idea", "lib", "coverage"],
  testEnvironment: "node",
  globals: {},
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { diagnostics: false }],
  },
  verbose: false,
}
