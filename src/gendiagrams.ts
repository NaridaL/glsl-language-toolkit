// noinspection JSUnusedGlobalSymbols

import * as path from "path"
import * as fs from "fs"

import { createSyntaxDiagramsCode, IToken } from "chevrotain"
import "colors"
import prettier from "prettier"

import * as prettierPlugin from "./prettier-plugin"
import { isToken } from "./prettier-plugin"
import { GLSL_PARSER, parseInput } from "./parser"
import "./checker"
import { Node } from "./nodes"

// create the HTML Text
const htmlText = createSyntaxDiagramsCode(
  GLSL_PARSER.getSerializedGastProductions(),
)
// Write the HTML file to disk
fs.writeFileSync(path.join(__dirname, "../generated_diagrams.html"), htmlText)

// const fileName = "../fixtures/shader.glsl";
// const fileName = "../builtins.glsl"
const fileName = "../fixtures/raymarchingPrimitives.glsl"
const shader = fs.readFileSync(require.resolve(fileName), {
  encoding: "utf8",
})

console.time("parsing")
const cst = parseInput(shader)
console.timeEnd("parsing")
function shortDesc(node: Node | IToken) {
  return isToken(node)
    ? `${node.tokenType.name}(${node.image}) ${node.startOffset}-${node.endOffset}`
    : `${node.kind} ${(node as any).firstToken.startOffset}-${
        (node as any).lastToken.endOffset
      }`
}
fs.writeFileSync(
  "./cst.json",
  JSON.stringify(
    cst,
    (key, value) =>
      key === "children"
        ? value.map(shortDesc)
        : value?.image
        ? shortDesc(value)
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
  // printWidth: 40,
})
fs.writeFileSync("./shader-formatted.glsl", formatted, { encoding: "utf8" })
