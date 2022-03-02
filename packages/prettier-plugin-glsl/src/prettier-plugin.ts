// noinspection JSUnusedGlobalSymbols

import { AstPath, Doc, format, ParserOptions, Plugin, SupportInfo, util } from "prettier"
import * as doc from "prettier/doc"
import { IToken, TokenType } from "chevrotain"

import { AbstractVisitor, BinaryExpression, isExpression, isToken, Node, Token, TypeQualifier } from "./nodes"
import { TOKEN } from "./lexer"
import { parseInput } from "./parser"
import isNextLineEmpty = util.isNextLineEmpty

const {
  utils: { propagateBreaks },
  printer: { printDocToString },
  builders: {
    indentIfBreak,
    group,
    indent,
    join,
    line,
    softline,
    hardline,
    fill,
  },
} = doc

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

function locEnd(node: Node | IToken) {
  return (
    isToken(node) ? node : (node as unknown as { lastToken: IToken }).lastToken
  ).endOffset!
}

export const parsers: Plugin<Node | IToken>["parsers"] = {
  "glsl-parse": {
    parse(text, parsers, options) {
      const translationUnit = parseInput(text)
      translationUnit.comments?.forEach((c) => ((c as any).value = JSON.stringify(c)))
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
    locEnd,
  },
}

function normalizeFloat(image: string) {
  const dot = image.indexOf(".")
  // .xxx => 0.xxx
  if (dot === 0) {
    image = "0" + image
  }
  // xEx => xex
  image = image.replace("E", "e")
  if (dot !== -1) {
    // x.exxx => xexxx
    image = image.replace(".e", "e")

    // x.x000 => x.x
    image = image.replace(/0+$/, "")

    // x. => x.0
    image = image.replace(/\.$/, ".0")

    // xe00x => xex
    image = image.replace(/e0+/, "e")
  }

  // xe+x => xex
  image = image.replace("e+", "e")

  return image
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

function getPrecedence(n: Node, inMacro: Token[] | undefined): number {
  switch (n.kind) {
    default:
      return 1
    case "variableExpression":
      return inMacro?.find((t) => t.image === n.var.image) ? 18 : 1
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

function printBinaryExpression(
  path: AstPath<Node | IToken>,
  print: (path: AstPath<Node | IToken>) => Doc,
  n: BinaryExpression,
  inMacro: Token[] | undefined,
): Doc[] {
  // Binary operation chains with the same operator precedence should either
  // completely break or not at all. E.g. a + b + ccccccccccccc should be
  // "a +\nb +\nccccccccccccc", not "a + b + \nccccccccccccc".
  const shouldFlatten =
    n.lhs.kind === "binaryExpression" &&
    getOpPrecedence(n.lhs.op.tokenType) === getOpPrecedence(n.op.tokenType)
  const lhsDoc = path.call(
    shouldFlatten
      ? (path) =>
        printBinaryExpression(
          path,
          print,
          path.getValue() as BinaryExpression,
          inMacro,
        )
      : print,
    "lhs",
  )

  return [
    paren(
      lhsDoc,
      getPrecedence(n.lhs, inMacro) > getOpPrecedence(n.op.tokenType),
    ),
    " ",
    path.call(print, "op"),
    line,
    paren(
      path.call(print, "rhs"),
      getPrecedence(n.rhs, inMacro) >= getOpPrecedence(n.op.tokenType),
    ),
  ]
}

function glug(doc: Doc, options: ParserOptions<Node | IToken>): string {
  propagateBreaks(doc)
  const formatted = printDocToString(
    doc,
    Object.assign({}, options, {
      printWidth: options.printWidth - 2,
    }),
  ).formatted
  console.log("formatted", formatted)
  return formatted
    .trim()
    .replace(
      /^.*(?=[\r\n])/gm,
      (substr: string) =>
        substr + " ".repeat(options.printWidth - 2 - substr.length + 1) + "\\",
    )
}

export const printers: Plugin<Node | IToken>["printers"] = {
  "glsl-ast": {
    print(
      path,
      options: ParserOptions<Node | IToken> & { inMacro?: Token[] },
      print,
    ): Doc {
      const inMacro = options.inMacro
      const n = path.getValue()
      if (!n) {
        return []
      }
      if (isToken(n)) {
        return n.image
      }
      const p = <N extends Node, S extends keyof N>(_: N, s: S) =>
        path.call(print, s)

      const tok = <N extends Node>(
        n: N,
        tokenType: TokenType,
        index = 0,
      ): Doc => {
        if (!n.tokens) {
          return tokenType.PATTERN! as string
        } else {
          // TODO: get preprocess stuff
          return n.tokens.find((t) => t.tokenType === tokenType)!.image
        }
      }

      try {
        switch (n.kind) {
          ////////// DECLARATIONS
          case "translationUnit":
            return [join(hardline, path.map(print, "declarations")), hardline]
          case "fullySpecifiedType": {
            const parts: Doc = []
            if (n.typeQualifier) {
              parts.push(p(n, "typeQualifier"))
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
              parts.push(p(n, "storageQualifier"))
            }
            return parts
          }
          case "storageQualifier": {
            const parts: Doc = []
            if (n.CONST) {
              parts.push("const ")
            }
            // SPEC: "A variable may be qualified as flat centroid, which will
            // mean the same thing as qualifying it only as flat."
            // Normalize to just flat.
            if (
              n.CENTROID &&
              (path.getParentNode() as TypeQualifier).interpolationQualifier
                ?.tokenType !== TOKEN.FLAT
            ) {
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
              " ",
              indent(join([",", line], path.map(print, "declarators"))),
              ";",
            ])
          case "declarator": {
            const name = p(n, "name")
            const arraySpecifier = p(n, "arraySpecifier")
            if (!n.init) {
              return [name, arraySpecifier]
            } else {
              const groupId = Symbol("declarator")
              // TODO: need this group?
              return group([
                name,
                arraySpecifier,
                " =",
                group(indent(line), { id: groupId }),
                indentIfBreak(p(n, "init"), { groupId }),
              ])
            }
          }
          case "arraySpecifier":
            return ["[", p(n, "size"), "]"]
          case "arrayAccess":
            return [
              paren(p(n, "on"), getPrecedence(n.on, inMacro) > 2),
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
          case "compoundStatement": {
            const x: Doc = [line]

            path.each((path, index, statements) => {
              const value = path.getValue()
              if (index !== 0) {
                x.push(hardline)
              }
              x.push(print(path))
              if (isNextLineEmpty(options.originalText, value, locEnd)) {
                x.push(hardline)
              }
            }, "statements")

            return group(["{", indent(x), line, "}"])
          }
          case "returnStatement": {
            const what = p(n, "what")
            return ["return", " ", what, ";"]
            // return ["return", " ", conditionalGroup([what, indent(what)]), ";"]
          }
          case "breakStatement":
            return ["break", ";"]
          case "selectionStatement":
            return [
              group([
                "if (",
                group([indent([softline, p(n, "condition")]), softline]),
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
                tok(n, TOKEN.FOR),
                " ",
                tok(n, TOKEN.LEFT_PAREN),
                indent([
                  softline,
                  p(n, "initExpression"),
                  line,
                  p(n, "conditionExpression"),
                  tok(n, TOKEN.SEMICOLON),
                  line,
                  p(n, "loopExpression"),
                ]),
                softline,
                tok(n, TOKEN.RIGHT_PAREN),
              ]),
              n.statement.kind === "compoundStatement"
                ? [" ", p(n, "statement")]
                : group([indent([line, p(n, "statement")])]),
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
              paren(p(n, "on"), getPrecedence(n.on, inMacro) > 2),
              ".",
              p(n, "functionCall"),
            ]
          case "postfixExpression":
            return [
              paren(p(n, "on"), getPrecedence(n.on, inMacro) > 2),
              p(n, "op"),
            ]
          case "unaryExpression":
            return [
              p(n, "op"),
              paren(p(n, "on"), getPrecedence(n.on, inMacro) > 3),
            ]
          case "assignmentExpression": {
            const groupId = Symbol("assignment")
            return group([
              p(n, "lhs"),
              " ",
              p(n, "op"),
              group(indent(line), { id: groupId }),
              indentIfBreak(p(n, "rhs"), { groupId }),
            ])
          }
          case "conditionalExpression":
            return [
              paren(
                p(n, "condition"),
                getPrecedence(n.condition, inMacro) >= 15,
              ),
              indent([line, "? ", p(n, "yes"), line, ": ", p(n, "no")]),
            ]
          case "binaryExpression":
            return group(printBinaryExpression(path, print, n, inMacro))
          case "expressionStatement":
            return [p(n, "expression"), ";"]
          case "fieldAccess":
            return [
              paren(p(n, "on"), getPrecedence(n.on, inMacro) > 2),
              ".",
              p(n, "field"),
            ]
          case "constantExpression": {
            const c = n._const
            if (c.tokenType === TOKEN.FLOATCONSTANT) {
              return normalizeFloat(c.image)
            }
            return c.image
          }
          case "variableExpression":
            return n.var.image
          case "ppDefine": {
            options.inMacro = n.params
            const doc = group([
              "#define",
              " ",
              p(n, "what"),
              n.params
                ? ["(", join([", "], path.map(print, "params")), ")"]
                : "",
              indent([
                line,
                n.node
                  ? paren(p(n, "node"), isExpression(n.node))
                  : fill(join(line, path.map(print, "tokens")).parts),
              ]),
            ])
            options.inMacro = undefined
            return glug(doc, options)
          }
          case "ppDir": {
            return glug(
              group([
                "#",
                n.dir.image,
                " ",
                indent(
                  n.node
                    ? p(n, "node")
                    : fill(join(line, path.map(print, "tokens")).parts),
                ),
              ]),
              options,
            )
          }
          case "ppCall": {
            return [
              n.callee.image,
              "(",
              path.map(
                (
                  path: AstPath<Node | IToken>,
                  index: number,
                  value: { tokens: Token[]; node: Node | undefined }[],
                ): doc.builders.Doc => {
                  console.log("vaaa", value)
                  return value[index].tokens.map((t) => t.image)
                },
                "args",
              ),
              ")",
            ]
          }
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
          "error printing " + JSON.stringify(n).substr(0, 100) + "\n",
        )
        throw e
      }
    },

    // @ts-expect-error getCommentChildNodes isn't in the API for some reason
    getCommentChildNodes(node: Node | Token): Node[] {
      return isToken(node) ? [] : CHILDREN_VISITOR.visit(node)!
    },
    canAttachComment(_node) {
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
      return n.image
    },
  },
}
