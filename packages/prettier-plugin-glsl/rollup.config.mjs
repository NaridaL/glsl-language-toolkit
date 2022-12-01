/* eslint-disable */
import typescriptPlugin from "@rollup/plugin-typescript"
import typescript from "typescript"
import { terser } from "rollup-plugin-terser"

import pkg from "./package.json" assert { type: "json" }

let compress = false
export default [
  {
    input: "src/prettier-plugin.ts",
    output: {
      format: "commonjs",
      entryFileNames: "[name].[format]" + (compress ? ".min" : "") + ".js",
      sourcemap: true,
      sourcemapExcludeSources: true,
      dir: "lib",
      exports: "named",
      globals: {
        chevrotain: "chevrotain",
        lodash: "lodash",
      },
      plugins: compress
        ? [
          terser({
            compress: {
              passes: 3,
              unsafe: true,
              ecma: 7,
            },
            toplevel: true,
            mangle: {
              properties: { regex: /^_/ },
            },
          }),
        ]
        : [],
    },
    external: Object.keys(pkg.dependencies || {}),
    plugins: [
      typescriptPlugin({
        typescript,
        tsconfig: "tsconfig.build.json",
        outDir: "lib",
      }),
    ].filter((x) => x),
    onwarn: function(warning, warn) {
      if ("THIS_IS_UNDEFINED" === warning.code) return
      if ("CIRCULAR_DEPENDENCY" === warning.code) {
        const m = warning.message.match(
          /^Circular dependency: (.*) -> .* -> .*$/,
        )
        if (m) {
          const start = m[1]
          if (start.match(/out[/\\]index.js|src[/\\]index.test.ts/)) {
            // this is a loop of length three starting at the index file: don't warn
            return
          }
        }
      }

      warn(warning)
    },
  },
]
