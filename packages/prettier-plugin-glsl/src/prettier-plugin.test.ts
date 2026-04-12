/* eslint-disable */
import {describe, test} from "@jest/globals"
import { readdirSync, readFileSync } from "fs"
import expect from "expect"
import * as prettier from "prettier"

import * as prettierPlugin from "./prettier-plugin"
import { dedent } from "./testutil"

const __dirname = import.meta.dirname;

export function fmt(source: string, printWidth = 80): Promise<string> {
  return prettier.format(source, {
    parser: "glsl-parser",
    plugins: [prettierPlugin],
    // pluginSearchDirs: ["./src/testutil"],
    printWidth,
  })
}

export async function testFormat(
  source: string,
  expected: string = source,
  printWidth?: number,
  trim = true,
): Promise<void> {
  const doTrim = (s: string) => (trim ? s.trim() : s)
  const formattedOnce = doTrim(await fmt(source, printWidth))
  expect(formattedOnce).toBe(doTrim(expected))
  // Formatting should be stable, i.e. formatting something already formatted
  // should never result in changes.
  const formattedTwice = doTrim(await fmt(formattedOnce, printWidth))
  expect(formattedTwice).toBe(formattedOnce)
}

function loadFixture(fixture: string): string {
  return readFileSync(__dirname + "/../fixtures/" + fixture, {
    encoding: "utf8",
  })
}

describe("fixtures", () => {
  const skip = new Set(["selection-statement", "switch"])
  for (const file of readdirSync(__dirname + "/../fixtures")) {
    if (file.endsWith(".pretty.glsl")) {
      const f = file.replace(/\.pretty\.glsl/, "")
      const t = skip.has(f) ? test.skip : test
      t(f, () =>
        testFormat(
          loadFixture(f + ".glsl"),
          loadFixture(f + ".pretty.glsl"),
          40,
        ),
      )
    }
  }
})

test("simplifies qualifiers", () => {
  testFormat("flat centroid in float f;", "flat in float f;")
})

// as own test due to printWidth=80
test.skip("format raymarchingPrimitives.glsl", () => {
  testFormat(
    loadFixture("raymarchingPrimitives.glsl"),
    loadFixture("raymarchingPrimitives-formatted.glsl"),
  )
})
test("format builtins", () => {
  const s = readFileSync("builtins.glsl", { encoding: "utf-8" })
  testFormat(s, s)
})
