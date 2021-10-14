import expect from "expect"
import prettier from "prettier"
import * as prettierPlugin from "./prettier-plugin"
import { parseInput } from "./parser"

test("parse multi-dim array", () => {
  parseInput(`
    void foo() {
      float[2] = float[2](1., 2.);
    }
     `).toMatchInlineSnapshot()
})
