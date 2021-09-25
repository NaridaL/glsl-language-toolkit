// noinspection JSUnusedGlobalSymbols

import * as path from "path"
import * as fs from "fs"

import {
  createSyntaxDiagramsCode,
  ILexingResult,
  IRecognitionException,
  IToken,
} from "chevrotain"
import "colors"
import prettier from "prettier"

import * as prettierPlugin from "./prettier-plugin"
import { GLSL_PARSER } from "./parser"
import { GLSL_LEXER } from "./lexer"

// create the HTML Text
const htmlText = createSyntaxDiagramsCode(
  GLSL_PARSER.getSerializedGastProductions(),
)
// Write the HTML file to disk
fs.writeFileSync(path.join(__dirname, "../generated_diagrams.html"), htmlText)

const shader = fs.readFileSync(require.resolve("../fixtures/shader.glsl"), {
  encoding: "utf8",
})
const raymarchingPrimitives = fs.readFileSync(
  "./fixtures/raymarchingPrimitives.glsl",
  {
    encoding: "utf8",
  },
)

function underline(
  str: string,
  start: number,
  end: number,
  ff = (x: string) => x.yellow.underline,
  ff2 = (x: string) => x,
): string {
  return (
    ff2(str.substr(0, start)) +
    ff(str.substr(start, end - start)) +
    ff2(str.substr(end))
  )
}

function substrContext(
  input: string,
  token: Pick<IToken, "startLine" | "endLine" | "startColumn" | "endColumn">,
) {
  const lines = input.split("\n")
  const sLine = token.startLine!
  const eLine = token.endLine!
  return (
    "./src/compiler.lambda:" +
    sLine +
    ":" +
    (token.startColumn! - 1) +
    "\n" +
    lines
      .map((l, i) => [i + 1, l] as [number, string])
      .slice(sLine - 2, eLine + 2)
      .map(([n, l]) => {
        if (n >= sLine && n <= eLine) {
          l = underline(
            l,
            sLine === n ? token.startColumn! - 1 : 0,
            eLine === n ? token.endColumn! : l.length,
            (s) => s.red.underline,
          )
        }

        return ("" + n).padStart(5).green + " " + l
      })
      .join("\n")
  )
  // start -= 20
  // if (start < 0) {
  //   start = 0
  // } else {
  //   start = input.lastIndexOf("\n", start) + 1
  // }
  // end += 20
  // if (end > input.length) {
  //   end = input.length
  // } else {
  //   end = input.indexOf("\n", end)
  // }
  // return input.substr(start, end)
}

function checkLexingErrors(input: string, lexingResult: ILexingResult) {
  if (lexingResult.errors.length) {
    throw new Error(
      "LEXER ERROR: " +
        lexingResult.errors
          .map(
            (e) =>
              e.message +
              ":\n" +
              substrContext(input, {
                startLine: e.line,
                startColumn: e.column,
                endLine: e.line,
                endColumn: e.column + e.length,
              }),
          )
          // .map((e) => e.message)
          .join(),
    )
  }
}

function checkParsingErrors(input: string, errors: IRecognitionException[]) {
  if (errors.length > 0) {
    throw new Error(
      "PARSE ERROR: " +
        errors
          .map(
            (e) =>
              e.message +
              "\n" +
              e.context.ruleStack.join(" > ") +
              "\n" +
              substrContext(input, e.token),
          )
          .join("\n"),
    )
  }
}

export function parseInput(text: string) {
  const lexingResult = GLSL_LEXER.tokenize(text)
  checkLexingErrors(text, lexingResult)

  let message = lexingResult.tokens.map(
    (t) => `${t.tokenType.name}(${t.image})`,
  )
  console.log(message)

  // "input" is a setter which will reset the glslParser's state.
  GLSL_PARSER.input = lexingResult.tokens
  const result = GLSL_PARSER.translationUnit()
  checkParsingErrors(text, GLSL_PARSER.errors)

  result.comments = lexingResult.groups.COMMENTS
  return result
}

console.time("parsing")
const cst = parseInput(shader)
console.timeEnd("parsing")
fs.writeFileSync(
  "./cst.json",
  JSON.stringify(
    cst,
    (key, value) =>
      key == "children"
        ? value.map((v: any) =>
            v.tokenType
              ? "" + v.tokenType.name + " " + v.startOffset
              : "" + v.type + " " + v.firstToken,
          )
        : value?.image
        ? `TOKEN: ${value.tokenType.name}(${value.image})`
        : value || null,
    "  ",
  ),
  {
    encoding: "utf8",
  },
)
console.log("PARSER SUCCESS!!!".green)

const formatted = prettier.format(shader, {
  parser: "glsl-parse",
  plugins: [prettierPlugin],
})
fs.writeFileSync("../shader-formatted.glsl", formatted, { encoding: "utf8" })
