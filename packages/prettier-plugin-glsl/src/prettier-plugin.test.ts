/* eslint-disable */

import { readdirSync, readFileSync } from "fs"
import expect from "expect"
import * as prettier from "prettier"

import * as prettierPlugin from "./prettier-plugin"
import { dedent } from "./testutil"

function fmt(source: string, printWidth = 80): string {
  return prettier.format(source, {
    parser: "glsl-parser",
    plugins: [prettierPlugin],
    pluginSearchDirs: ["./src/testutil"],

    printWidth,
  })
}

function testFormat(
  source: string,
  expected: string = source,
  printWidth?: number,
  trim = true,
): void {
  const doTrim = (s: string) => (trim ? s.trim() : s)
  const formattedOnce = doTrim(fmt(source, printWidth))
  expect(formattedOnce).toBe(doTrim(expected))
  // Formatting should be stable, i.e. formatting something already formatted
  // should never result in changes.
  const formattedTwice = doTrim(fmt(formattedOnce, printWidth))
  expect(formattedTwice).toBe(formattedOnce)
}

function loadFixture(fixture: string): string {
  return readFileSync(__dirname + "/../fixtures/" + fixture, {
    encoding: "utf8",
  })
}

describe("fixtures", () => {
  for (const file of readdirSync(__dirname + "/../fixtures")) {
    if (file.endsWith(".pretty.glsl")) {
      const f = file.replace(/\.pretty\.glsl/, "")
      test(f, () =>
        testFormat(
          loadFixture(f + ".glsl"),
          loadFixture(f + ".pretty.glsl"),
          40,
        ),
      )
    }
  }
})

interface X {
  a: x

  b: y
}

test("format es", () => {
  OtherStruct[
    CONSTANT_VALUE *
      MsssssssssssssssssssssssssACRO_INVOCATjjjjjjjjjjjjjjjjION(2, 3)
  ] = 3 + ddddddddddddddddddddddd
  const x = dedent`
    function main() {
      let i = func(sssssssssssssssssssssssssss, sssssssssssssssssssssssssss,ssssssssssssssssss);
    }`
  const x2 = prettier.format(x, {
    // parser: "estree",

    printWidth: 80,
  })
  expect(x2).toEqual(" sdasd")
})
test("simplifies qualifiers", () => {
  testFormat("flat centroid in float f;", "flat in float f;")
})

// as own test due to printWidth=80
test("format raymarchingPrimitives.glsl", () => {
  testFormat(
    loadFixture("raymarchingPrimitives.glsl"),
    loadFixture("raymarchingPrimitives-formatted.glsl"),
  )
})
test("format builtins", () => {
  const s = readFileSync("builtins.glsl", { encoding: "utf-8" })
  testFormat(s, s)
})
