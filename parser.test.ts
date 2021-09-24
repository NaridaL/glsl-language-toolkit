import expect, { MatcherState } from "expect"
import { printDiffOrStringify } from "jest-matcher-utils"
import { glslParser, parseInput } from "./index"
import prettier from "prettier"
import * as prettierPlugin from "./prettier-plugin"
test("parse multi-dim array", () => {
  parseInput(`
    void foo() {
      float[2] = float[2](1., 2.);
    }
     `).toMatchInlineSnapshot()
})

test("prettier", () => {
  const formatted = prettier.format("void foo(){return ha;}", {
    parser: "glsl-parse",
    plugins: [prettierPlugin],
  })
  expect(formatted).toMatchInlineSnapshot(`"HIII!!"`)
})
