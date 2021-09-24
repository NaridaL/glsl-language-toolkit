import {
  AstPath,
  doc,
  Doc,
  getSupportInfo,
  ParserOptions,
  Plugin,
  SupportInfo,
} from "prettier"
import { builders } from "prettier/doc"
import { CstNode, parseInput } from "./index"
import { IToken } from "chevrotain"

const { group, indent, join, line, softline, hardline } = builders

export const languages: SupportInfo["languages"] = [
  { name: "glsl", parsers: ["glsl-parser"] },
]

export const parsers: Plugin<CstNode | IToken>["parsers"] = {
  "glsl-parse": {
    parse: (text, parsers, options) => {
      return parseInput(text)
    },
    astFormat: "glsl-ast",
    locStart: () => 0,
    locEnd: () => 0,
  },
}
function isToken(x: unknown): x is IToken {
  return (x as any).tokenType
}

export const printers: Plugin<CstNode | IToken>["printers"] = {
  "glsl-ast": {
    print(path, options, print): Doc {
      const node = path.getValue()
      if (!node) return []
      if (isToken(node)) {
        return node.image
      }
      try {
        switch (node.type) {
          case "translationUnit":
            return join(hardline, path.map(print, "declarations"))
          case "FULLY_SPECIFIED_TYPE":
            return [
              path.call(print, "typeQualifier"),
              path.call(print, "typeSpecifier"),
            ]
          case "typeSpecifier":
            return [
              path.call(print, "precisionQualifier"),
              path.call(print, "typeSpecifierNonArray"),
            ]
          case "functionDeclaration":
          case "functionDefinition":
            return group([
              path.call(print, "returnType"),
              " ",
              path.call(print, "name"),
              "(",
              indent([join([",", line], path.map(print, "params"))]),
              ")",
              "functionDefinition" === node.type
                ? ";"
                : path.call(print, "body"),
            ])
          case "parameterDeclaration":
            return [
              path.call(print, "parameterTypeQualifier"),
              " ",
              path.call(print, "typeSpecifier"),
              " ",
              path.call(print, "pName"),
              path.call(print, "arrayInit"),
            ]
          case "initDeclaratorList":
            return []
          case "compoundStatement":
            return ["{", path.map(print, "statements"), "}"]
          case "returnStatement":
            return ["return", " ", path.call(print, "what"), "}"]
          case "functionCall":
            return [
              path.call(print, "what"),
              "(",
              join([",", line], path.map(print, "args")),
              ")",
            ]
          case "binaryExpression":
            return [
              path.call(print, "lhs"),
              path.call(print, "op"),
              path.call(print, "rhs"),
            ]
          case "fieldAccess":
            return [path.call(print, "on"), ".", path.call(print, "what")]
          default:
            throw new Error(
              "unexpected node type " +
                node.type +
                "\n" +
                JSON.stringify(node).substr(0, 100),
            )
        }
      } catch (e) {
        console.error(
          "error parsing " + JSON.stringify(node).substr(0, 100) + "\n",
        )
        throw e
      }
    },
  },
}
