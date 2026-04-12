module.exports = {
  testPathIgnorePatterns: [
    ".idea",
    "lib",
    "coverage",
    "shadertoy\\.test",
  ],
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transformIgnorePatterns: ["node_modules/(?!(chevrotain|@chevrotain)/)"],
  transform: {
    "\\.[jt]sx?$": "babel-jest",
    "\\.glsl$": "./glsl-transform.cjs",
  },
  verbose: false,
}
