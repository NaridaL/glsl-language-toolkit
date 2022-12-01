// // noinspection JSUnusedGlobalSymbols
//
// import * as path from "path"
// import * as fs from "fs"
//
// import { createSyntaxDiagramsCode } from "chevrotain"
// // import prettier from "prettier"
import { mapValues } from "lodash"
// import * as prettierPlugin from "./prettier-plugin"
import { shortDesc } from "./parser"
// import "./checker"
import { isToken, Node } from "./nodes"
//
// // create the HTML Text
// const htmlText = createSyntaxDiagramsCode(
//   GLSL_PARSER.getSerializedGastProductions(),
// )
// // Write the HTML file to disk
// fs.writeFileSync(path.join(__dirname, "../generated_diagrams.html"), htmlText)
//
// // const fileName = "../fixtures/shader.glsl";
// // const fileName = "../builtins.glsl"
// const fileName = "../fixtures/raymarchingPrimitives.glsl"
// const shader = fs.readFileSync(require.resolve(fileName), {
//   encoding: "utf8",
// })
//
// console.time("parsing")
// const cst = parseInput(shader)
// console.timeEnd("parsing")
//
export function recurseJSON(
  replacer: (this: any, key: string, value: any) => any,
  x: unknown,
): any {
  if (Array.isArray(x)) {
    return x.map((e, i, collection) =>
      recurseJSON(replacer, replacer.call(collection, "" + i, e)),
    )
  } else if (typeof x === "object") {
    return mapValues(x, (value, key, collection) =>
      recurseJSON(replacer, replacer.call(collection, key, value)),
    )
  } else {
    return x
  }
}

export const simplifyCst = recurseJSON.bind(undefined, (key, value) =>
  key === "children"
    ? (value as Node[]).map(shortDesc)
    : value && typeof value === "object" && isToken(value)
    ? shortDesc(value)
    : value,
)
// fs.writeFileSync(
//   "./cst.json",
//   JSON.stringify(simplifyCst(cst), undefined, "  "),
//   {
//     encoding: "utf8",
//   },
// )
// console.log("PARSER SUCCESS!!!".green)
//
// const formatted = prettier.format(shader, {
//   parser: "glsl-parse",
//   plugins: [prettierPlugin],
//   printWidth: 40,
// })
// fs.writeFileSync("./shader-formatted.glsl", formatted, { encoding: "utf8" })
