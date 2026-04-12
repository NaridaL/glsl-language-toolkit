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
  extensionsToTreatAsEsm: [".ts"],
  transformIgnorePatterns: ["node_modules/(?!(chevrotain|@chevrotain)/)"],
  verbose: false,
}
