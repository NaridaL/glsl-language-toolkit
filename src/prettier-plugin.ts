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
import { IToken } from "chevrotain"
import { CstNode, parseInput } from "./index"
import { Token } from "./nodes"

const { group, indent, join, line, softline, hardline } = builders

export const languages: SupportInfo["languages"] = [
  { name: "glsl", parsers: ["glsl-parser"] },
]

export const parsers: Plugin<CstNode | IToken>["parsers"] = {
  "glsl-parse": {
    parse(text, parsers, options) {
      const translationUnit = parseInput(text)
      translationUnit.comments?.forEach(
        (c) => ((c as any).value = JSON.stringify(c)),
      )
      return translationUnit
    },
    astFormat: "glsl-ast",
    locStart(node: CstNode | IToken) {
      return (
        isToken(node)
          ? node
          : (node as unknown as { firstToken: IToken }).firstToken
      ).startOffset
    },
    locEnd(node: CstNode | IToken) {
      return (
        isToken(node)
          ? node
          : (node as unknown as { lastToken: IToken }).lastToken
      ).endOffset!
    },
  },
}
function isToken(x: unknown): x is IToken {
  return (x as any).tokenType
}

export const printers: Plugin<CstNode | IToken>["printers"] = {
  "glsl-ast": {
    print(path, options, print): Doc {
      const n = path.getValue()
      if (!n) {
        return []
      }
      if (isToken(n)) {
        return n.image
      }
      const p = <N extends CstNode, S extends keyof N>(_: N, s: S) =>
        path.call(print, s)
      try {
        switch (n.type) {
          case "translationUnit":
            return join(hardline, path.map(print, "declarations"))
          case "fullySpecifiedType":
            return join(
              " ",
              [p(n, "typeQualifier"), p(n, "typeSpecifier")].filter(
                (x) => (x as any).length !== 0,
              ),
            )
          case "typeSpecifier":
            return join(
              " ",
              [
                p(n, "precisionQualifier"),
                p(n, "typeSpecifierNonArray"),
                p(n, "arraySpecifier"),
              ].filter((x) => (x as any).length !== 0),
            )
          case "typeQualifier":
            return join(
              " ",
              [
                p(n, "invariantQualifier"),
                p(n, "interpolationQualifier"),
                p(n, "layoutQualifier"),
                p(n, "storageQualifier"),
              ].filter((x) => (x as any).length !== 0),
            )
          case "storageQualifier":
            return [
              p(n, "CENTROID"),
              p(n, "IN"),
              p(n, "OUT"),
              p(n, "UNIFORM"),
              p(n, "CONST"),
            ]
          case "functionPrototype":
          case "functionDefinition":
            return [
              group([
                p(n, "returnType"),
                " ",
                p(n, "name"),
                "(",
                line,
                indent([join([",", line], path.map(print, "params"))]),
                line,
                ")",
              ]),
              "functionPrototype" === n.type ? ";" : [" ", p(n, "body")],
            ]
          case "parameterDeclaration":
            return [
              p(n, "parameterTypeQualifier"),
              " ",
              p(n, "typeSpecifier"),
              " ",
              p(n, "pName"),
              p(n, "arrayInit"),
            ]
          case "initDeclaratorListDeclaration":
            return [
              p(n, "fsType"),
              " ",
              join([",", line], path.map(print, "declarators")),
              ";",
            ]
          case "declarator":
            return [
              p(n, "name"),
              p(n, "arrayInit"),
              " ",
              n.init ? ["=", " ", p(n, "init")] : "",
            ]
          case "arrayInit":
            return ["[", "]"]
          case "arrayAccess":
            return [p(n, "on"), "[", p(n, "index"), "]"]
          case "compoundStatement":
            return group([
              "{",
              line,
              indent(join(hardline, path.map(print, "statements"))),
              line,
              "}",
            ])
          case "returnStatement":
            return ["return", " ", p(n, "what"), ";"]
          case "breakStatement":
            return ["break", ";"]
          case "selectionStatement":
            return [
              "if",
              " ",
              "(",
              p(n, "condition"),
              ")",
              p(n, "yes"),
              n.no ? ["else", p(n, "no")] : "",
            ]
          case "functionCall":
            return group([
              p(n, "what"),
              "(",
              join([",", line], path.map(print, "args")),
              ")",
            ])
          case "forStatement":
            return [
              "for",
              "(",
              p(n, "initExpression"),
              p(n, "conditionExpression"),
              ";",
              line,
              p(n, "loopExpression"),
              ")",
              p(n, "statement"),
            ]
          case "whileStatement":
            return [
              "while",
              "(",
              p(n, "conditionExpression"),
              ")",
              p(n, "statement"),
            ]
          case "doWhileStatement":
            return [
              "do",
              p(n, "statement"),
              "while",
              "(",
              p(n, "conditionExpression"),
              ")",
            ]
          case "postfixExpression":
            return [p(n, "on"), p(n, "op")]
          case "prefixExpression":
            return [p(n, "op"), p(n, "on")]
          case "assignmentExpression":
            return group([p(n, "lhs"), " ", p(n, "op"), line, p(n, "rhs")])
          case "binaryExpression":
            return group([p(n, "lhs"), " ", p(n, "op"), line, p(n, "rhs")])
          case "expressionStatement":
            return [p(n, "expression"), ";"]
          case "fieldAccess":
            return [p(n, "on"), ".", p(n, "field")]
          case "structSpecifier":
            return [
              "struct",
              " ",
              p(n, "name"),
              " ",
              "{",
              path.map(print, "declarations"),
              "}",
            ]
          case "structDeclaration":
            return [
              p(n, "fsType"),
              " ",
              join(
                ",",
                n.declarators.map((d) => d.name.image),
              ),
            ]
          default:
            throw new Error(
              "unexpected n type " +
                n.type +
                "\n" +
                JSON.stringify(n).substr(0, 100),
            )
        }
      } catch (e) {
        console.error(
          "error parsing " + JSON.stringify(n).substr(0, 100) + "\n",
        )
        throw e
      }
    },

    // @ts-expect-error
    getCommentChildNodes(node: CstNode | Token): CstNode[] {
      return isToken(node) ? [] : (node as any).children
    },
    printComment(
      // Path to the current comment node
      commentPath: AstPath,
      // Current options
      options: object,
    ): Doc {
      console.log("printComment".red)
      const n = commentPath.getValue()
      return n.image
    },
  },
}
