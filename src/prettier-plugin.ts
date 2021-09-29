// noinspection JSUnusedGlobalSymbols

import { AstPath, Doc, Plugin, SupportInfo } from "prettier"
import { builders } from "prettier/doc"
import { IToken } from "chevrotain"

import { CstNode } from "./parser"
import { Token } from "./nodes"
import { parseInput } from "./index"
import { TOKEN } from "./lexer"
import { format } from "prettier"

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
export function isToken(x: unknown): x is IToken {
  return (x as any).tokenType
}

function normalizeFloat(image: string) {
  return (+image).toLocaleString("en-US", { minimumFractionDigits: 1 })
}

export const printers: Plugin<CstNode | IToken>["printers"] = {
  "glsl-ast": {
    print(path, options, print): Doc {
      const n = path.getValue()
      if (!n) {
        return []
      }
      if (isToken(n)) {
        if (n.tokenType === TOKEN.FLOATCONSTANT) {
          return normalizeFloat(n.image)
        }
        return n.image
      }
      const p = <N extends CstNode, S extends keyof N>(_: N, s: S) =>
        path.call(print, s)
      try {
        switch (n.type) {
          ////////// DECLARATIONS
          case "translationUnit":
            return join(hardline, path.map(print, "declarations"))
          case "fullySpecifiedType":
            return [p(n, "typeQualifier"), p(n, "typeSpecifier")].filter(
              (x) => (x as any).length !== 0,
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
            const parts: Doc = []
            if (n.CONST) {
              parts.push("const ")
            }
            if (n.CENTROID) {
              parts.push("centroid ")
            }
            if (n.IN) {
              parts.push("in ")
            }
            if (n.OUT) {
              parts.push("out ")
            }
            if (n.UNIFORM) {
              parts.push("uniform ")
            }
            return parts
          case "functionPrototype":
          case "functionDefinition":
            return [
              group([
                p(n, "returnType"),
                " ",
                p(n, "name"),
                "(",
                indent([
                  softline,
                  join([",", line], path.map(print, "params")),
                ]),
                softline,
                ")",
              ]),
              "functionPrototype" === n.type ? ";" : [" ", p(n, "body")],
            ]
          case "parameterDeclaration":
            return [
              n.parameterTypeQualifier
                ? [p(n, "parameterTypeQualifier"), " "]
                : [],
              p(n, "typeSpecifier"),
              " ",
              p(n, "pName"),
              p(n, "arrayInit"),
            ]
          case "initDeclaratorListDeclaration":
          case "structDeclaration":
            return group([
              p(n, "fsType"),
              indent([line, join([",", line], path.map(print, "declarators"))]),
              ";",
            ])
          case "declarator":
            return [
              p(n, "name"),
              p(n, "arrayInit"),

              n.init ? [" = ", p(n, "init")] : "",
            ]
          case "arrayInit":
            return ["[", "]"]
          case "arrayAccess":
            return [p(n, "on"), "[", p(n, "index"), "]"]
          case "structSpecifier":
            return group([
              "struct",
              " ",
              p(n, "name"),
              " ",
              "{",
              indent([
                softline,
                join(softline, path.map(print, "declarations")),
              ]),
              softline,
              "}",
            ])

          ///////// STATEMENTS
          case "compoundStatement":
            return group([
              "{",
              indent([line, join(hardline, path.map(print, "statements"))]),
              line,
              "}",
            ])
          case "returnStatement":
            return ["return", " ", p(n, "what"), ";"]
          case "breakStatement":
            return ["break", ";"]
          case "selectionStatement":
            return group([
              "if",
              " ",
              "(",
              indent([softline, p(n, "condition")]),
              softline,
              ") ",
              p(n, "yes"),
              n.no ? ["else", p(n, "no")] : "",
            ])
          case "forStatement":
            return group([
              "for ",
              "(",
              indent([
                softline,
                p(n, "initExpression"),
                softline,
                p(n, "conditionExpression"),
                ";",
                line,
                p(n, "loopExpression"),
              ]),
              softline,
              ") ",
              p(n, "statement"),
            ])
          case "whileStatement":
            return [
              "while (",
              // p(n, "conditionExpression"),
              "true",
              ") ",
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

          ////////// EXPRESSIONS
          case "functionCall":
            return group([
              p(n, "what"),
              "(",
              indent([softline, join([",", line], path.map(print, "args"))]),
              softline,
              ")",
            ])
          case "postfixExpression":
            return [p(n, "on"), p(n, "op")]
          case "unaryExpression":
            return [p(n, "op"), p(n, "on")]
          case "assignmentExpression":
            return group([
              p(n, "lhs"),
              " ",
              p(n, "op"),
              indent([line, p(n, "rhs")]),
            ])
          case "binaryExpression":
            return group([p(n, "lhs"), " ", p(n, "op"), line, p(n, "rhs")])
          case "expressionStatement":
            return [p(n, "expression"), ";"]
          case "fieldAccess":
            return [p(n, "on"), ".", p(n, "field")]
          case "constantExpression":
            return n._const.image

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
    canAttachComment(node) {
      return true
    },
    printComment(
      // Path to the current comment node
      commentPath: AstPath,
      // Current options
      options,
    ): Doc {
      const n = commentPath.getValue()
      if (n.tokenType === TOKEN.MULTILINE_COMMENT && n.image[2] === "*") {
        const src = n.image
          .substr(3, n.image.length - 5)
          .split("\n")
          .map((l: string) => (l.startsWith(" * ") ? l.substr(3) : l))
          .join("\n")
        const fsrc = format(src, {
          ...options,
          printWidth: options.printWidth - 4,
          parser: "markdown",
          proseWrap: "always",
        })
        return (
          "/**\n" +
          fsrc
            .split("\n")
            .map((l) => " * " + l)
            .join("\n") +
          "\n */"
        )
      }
      console.log(n.image.blue)
      const parent = commentPath.getParentNode()
      console.log(
        `parent type=${parent.type} first = ${parent.firstToken.image}`.yellow,
      )
      console.log(
        `leading=${n.leading}    trailing=${n.trailing}  ${n.placement}`,
      )
      return n.image
    },
  },
}
