module.exports = {
  testPathIgnorePatterns: [
    ".idea",
    "lib",
    "coverage",
    "checker\\.test",
    "support\\.test",
    "shadertoy\\.test",
  ],
  testEnvironment: "node",
  globals: {},
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { diagnostics: false }],
  },
  verbose: false,
}
