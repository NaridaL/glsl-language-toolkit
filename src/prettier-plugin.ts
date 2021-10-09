// noinspection JSUnusedGlobalSymbols

import { AstPath, Doc, format, Plugin, SupportInfo } from "prettier"
import { builders } from "prettier/doc"
import { IToken, TokenType } from "chevrotain"
import { AbstractVisitor, Node, Token } from "./nodes"
import { TOKEN } from "./lexer"
import { parseInput } from "./parser"

const { group, indent, join, line, softline, hardline } = builders

export const CHILDREN_VISITOR: AbstractVisitor<Node[]> & {
  visit(n: Node): Node[]
} = new (class extends AbstractVisitor<Node[]> {
  private result: Node[] | undefined = undefined

  public visit(n: Node | undefined) {
    if (this.result) {
      if (n) {
        this.result.push(n)
      }
      return undefined
    } else {
      const result = (this.result = [])
      super.visit(n)
      this.result = undefined
      return result
    }
  }
})() as any

export const languages: SupportInfo["languages"] = [
  { name: "glsl", parsers: ["glsl-parser"] },
]

export const parsers: Plugin<Node | IToken>["parsers"] = {
  "glsl-parse": {
    parse(text, parsers, options) {
      const translationUnit = parseInput(text)
      translationUnit.comments?.forEach((c) => (c.value = JSON.stringify(c)))
      return translationUnit
    },
    astFormat: "glsl-ast",
    locStart(node: Node | IToken) {
      return (
        isToken(node)
          ? node
          : (node as unknown as { firstToken: IToken }).firstToken
      ).startOffset
    },
    locEnd(node: Node | IToken) {
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

function getOpPrecedence(op: TokenType): number {
  switch (op) {
    case TOKEN.STAR:
    case TOKEN.SLASH:
    case TOKEN.PERCENT:
      return 4
    case TOKEN.PLUS:
    case TOKEN.DASH:
      return 5
    case TOKEN.LEFT_OP:
    case TOKEN.RIGHT_OP:
      return 6
    case TOKEN.LEFT_ANGLE:
    case TOKEN.RIGHT_ANGLE:
    case TOKEN.LE_OP:
    case TOKEN.GE_OP:
      return 7
    case TOKEN.EQ_OP:
    case TOKEN.NE_OP:
      return 8
    case TOKEN.AMPERSAND:
      return 9
    case TOKEN.CARET:
      return 10
    case TOKEN.VERTICAL_BAR:
      return 11
    case TOKEN.AND_OP:
      return 12
    case TOKEN.XOR_OP:
      return 12
    case TOKEN.OR_OP:
      return 13
    case TOKEN.COMMA:
      return 17
    default:
      throw new Error()
  }
}
function getPrecedence(n: Node): number {
  switch (n.kind) {
    default:
      return 1
    case "arrayAccess":
    case "functionCall":
    case "fieldAccess":
    case "postfixExpression":
      return 2
    case "unaryExpression":
      return 3
    case "binaryExpression":
      return getOpPrecedence(n.op.tokenType)
    case "conditionalExpression":
      return 15
    case "assignmentExpression":
      return 16
    case "commaExpression":
      return 17
  }
}
function paren(doc: Doc, cond: boolean): Doc {
  return cond ? ["(", doc, ")"] : doc
}
export const printers: Plugin<Node | IToken>["printers"] = {
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
      const p = <N extends Node, S extends keyof N>(_: N, s: S) =>
        path.call(print, s)
      try {
        switch (n.kind) {
          ////////// DECLARATIONS
          case "translationUnit":
            return join(hardline, path.map(print, "declarations"))
          case "fullySpecifiedType": {
            const parts: Doc = []
            if (n.typeQualifier) {
              parts.push(p(n, "typeQualifier"), " ")
            }
            parts.push(p(n, "typeSpecifier"))
            return parts
          }
          case "typeSpecifier": {
            const parts: Doc = []
            if (n.precisionQualifier) {
              parts.push(n.precisionQualifier.image, " ")
            }
            parts.push(p(n, "typeSpecifierNonArray"))
            if (n.arraySpecifier) {
              parts.push(p(n, "arraySpecifier"))
            }
            return parts
          }
          case "typeQualifier": {
            const parts: Doc = []
            if (n.invariantQualifier) {
              parts.push("invariant ")
            }
            if (n.interpolationQualifier) {
              parts.push(n.interpolationQualifier.image, " ")
            }
            if (n.layoutQualifier) {
              parts.push(p(n, "layoutQualifier"), " ")
            }
            if (n.storageQualifier) {
              parts.push(p(n, "storageQualifier"), " ")
            }
            return parts
          }
          case "storageQualifier": {
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
          }
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
              n.kind === "functionPrototype" ? ";" : [" ", p(n, "body")],
            ]
          case "parameterDeclaration":
            return [
              n.parameterTypeQualifier
                ? [p(n, "parameterTypeQualifier"), " "]
                : "",
              n.parameterQualifier?.tokenType === TOKEN.OUT ||
              n.parameterQualifier?.tokenType === TOKEN.INOUT
                ? n.parameterQualifier?.image + " "
                : "",
              p(n, "typeSpecifier"),
              " ",
              p(n, "pName"),
              p(n, "arraySpecifier"),
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
              p(n, "arraySpecifier"),

              n.init ? [" = ", p(n, "init")] : "",
            ]
          case "arraySpecifier":
            return ["[", p(n, "size"), "]"]
          case "arrayAccess":
            return [
              paren(p(n, "on"), getPrecedence(n.on) > 2),
              "[",
              p(n, "index"),
              "]",
            ]
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
            return [
              group([
                "if",
                " ",
                "(",
                indent([softline, p(n, "condition")]),
                softline,
                ") ",
                p(n, "yes"),
              ]),
              n.no
                ? [
                    hardline,
                    "else",
                    n.no.kind === "selectionStatement" ? " " : line,
                    p(n, "no"),
                  ]
                : "",
            ]
          case "forStatement":
            return [
              group([
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
                ")",
              ]),
              group([indent([line, p(n, "statement")])]),
            ]
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
              p(n, "callee"),
              "(",
              indent([softline, join([",", line], path.map(print, "args"))]),
              softline,
              ")",
            ])
          case "methodCall":
            return [
              paren(p(n, "on"), getPrecedence(n.on) > 2),
              ".",
              p(n, "functionCall"),
            ]
          case "postfixExpression":
            return [paren(p(n, "on"), getPrecedence(n.on) > 2), p(n, "op")]
          case "unaryExpression":
            return [p(n, "op"), paren(p(n, "on"), getPrecedence(n.on) > 3)]
          case "assignmentExpression":
            return group([
              p(n, "lhs"),
              " ",
              p(n, "op"),
              indent([line, p(n, "rhs")]),
            ])
          case "conditionalExpression":
            return [
              paren(p(n, "condition"), getPrecedence(n.condition) >= 15),
              indent([line, "? ", p(n, "yes"), line, ": ", p(n, "no")]),
            ]
          case "binaryExpression": {
            const lhs = paren(
              p(n, "lhs"),
              getPrecedence(n.lhs) > getOpPrecedence(n.op.tokenType),
            )
            const rhs = paren(
              p(n, "rhs"),
              getPrecedence(n.rhs) >= getOpPrecedence(n.op.tokenType),
            )
            return group([lhs, " ", p(n, "op"), line, rhs])
          }
          case "expressionStatement":
            return [p(n, "expression"), ";"]
          case "fieldAccess":
            return [
              paren(p(n, "on"), getPrecedence(n.on) > 2),
              ".",
              p(n, "field"),
            ]
          case "constantExpression":
            return n._const.image
          case "variableExpression":
            return n.var.image
          default:
            throw new Error(
              "unexpected n type " +
                n.kind +
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
    getCommentChildNodes(node: Node | Token): Node[] {
      return isToken(node) ? [] : CHILDREN_VISITOR.visit(node)!
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
      const n = commentPath.getValue() as Token
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
