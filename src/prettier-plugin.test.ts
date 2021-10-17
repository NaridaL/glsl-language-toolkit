/* eslint-disable */

import { readFileSync } from "fs"
import expect from "expect"
import prettier from "prettier"
import * as prettierPlugin from "./prettier-plugin"
import { parseInput } from "./parser"

function fmt(source: string, printWidth = 80): string {
  return prettier.format(source, {
    parser: "glsl-parse",
    plugins: [prettierPlugin],

    printWidth,
  })
}
function testFormat(
  source: string,
  expected: string,
  printWidth?: number,
): void {
  const formattedOnce = fmt(source, printWidth).trim()
  expect(formattedOnce).toBe(expected)
  // Formatting should be stable, i.e. formatting something already formatted
  // should never result in changes.
  const formattedTwice = fmt(formattedOnce, printWidth).trim()
  expect(formattedTwice).toBe(formattedOnce)
}

function loadFixture(fixture: string): string {
  return readFileSync(__dirname + "/../fixtures/" + fixture, {
    encoding: "utf8",
  })
}

test("prettier", () => {
  testFormat("void foo(){return ha;}", "void foo() { return ha; }")
})
test("chained binary expressions all break on same op precedence", () => {
  testFormat(
    "let i = a+b+cccccccccccccccccccccccccccccc;",
    "let i = a +\n  b +\n  cccccccccccccccccccccccccccccc;",
    40,
  )
})

test("required paren are kept", () => {
  testFormat("int i = -(9+b);", "int i = -(9 + b);")
  testFormat("int i = (a ? b : c) ? d : e;", "int i = (a ? b : c) ? d : e;")
  testFormat("int i = (a = b) ? d : e;", "int i = (a = b) ? d : e;")
  testFormat("int i = (a+b).xy;", "int i = (a + b).xy;")
  testFormat("int i = (a + b)[0];", "int i = (a + b)[0];")
  testFormat("int i = (a + b).length();", "int i = (a + b).length();")
})
test("constants", () => {
  testFormat("float f = 2.2E+23;", "float f = 2.2e23;")
  testFormat("float f = 2.e-23;", "float f = 2e-23;")
  testFormat("float f = .200;", "float f = 0.2;")
  testFormat("float f = 2.;", "float f = 2.0;")
})
test("for loop", () => {
  testFormat("void f() { for(;;); }", "void f() { for (;; ) ; }")
})
test("simplifies qualifiers", () => {
  testFormat("flat centroid in float f;", "flat in float f;")
})
test("format raymarchingPrimitives.glsl", () => {
  testFormat(
    loadFixture("raymarchingPrimitives.glsl"),
    loadFixture("raymarchingPrimitives-formatted.glsl"),
  )
})
