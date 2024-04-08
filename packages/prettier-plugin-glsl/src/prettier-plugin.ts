// noinspection JSUnusedGlobalSymbols

import {
  AstPath,
  Doc,
  Options,
  ParserOptions,
  Plugin,
  SupportInfo,
  util,
} from "prettier"
import * as doc from "prettier/doc"
import { IToken, TokenType } from "chevrotain"
import { findLast } from "lodash"

import {
  AbstractVisitor,
  AssignmentExpression,
  BinaryExpression,
  CommaExpression,
  Declarator,
  FunctionCall,
  isExpression,
  isNode,
  isToken,
  Node,
  StructDeclaration,
  Token,
  TypeQualifier,
} from "./nodes"
import { isBitwiseOperator, TOKEN } from "./lexer"
import { parseInput } from "./parser"
import { getMatrixDimensions } from "./node-helpers"

interface PrettierComment extends Token {
  leading: boolean
  trailing: boolean
  printed: boolean
  value: string
}

declare module "./nodes" {
  interface BaseNode {
    comments?: PrettierComment[]
  }
}

const {
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
    lineSuffixBoundary,
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
  {
    name: "glsl",
    parsers: ["glsl-parser"],
    // https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
    extensions: [
      ".glsl",
      ".fp",
      ".frag",
      ".frg",
      ".fs",
      ".fsh",
      ".fshader",
      ".geo",
      ".geom",
      ".glslf",
      ".glslv",
      ".gs",
      ".gshader",
      ".rchit",
      ".rmiss",
      ".shader",
      ".tesc",
      ".tese",
      ".vert",
      ".vrx",
      ".vsh",
      ".vshader",
    ],
  },
]

function locStart(node: Node | IToken) {
  return (isToken(node) ? node : node.firstToken!).startOffset
}

function locEnd(node: Node | IToken) {
  return (isToken(node) ? node : node.lastToken!).endOffset! + 1
}

export const parsers: Plugin<Node | IToken>["parsers"] = {
  "glsl-parser": {
    parse(text, _options) {
      const translationUnit = parseInput(text)
      translationUnit.comments?.forEach(
        (c) => ((c as PrettierComment).value = JSON.stringify(c)),
      )
      return translationUnit
    },
    astFormat: "glsl-ast",
    locStart,
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

    // x.x000 => x.x (but not x.xe10 => x.xe1)
    image = image.replace(/(?<!e.*)0+$/, "")

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

function printBinaryishExpressions(
  path: AstPath<Node | IToken>,
  print: (path: AstPath<Node | IToken>) => Doc,
  n: BinaryExpression | CommaExpression,
  inMacro: Token[] | undefined,
): Doc[] {
  // Binary operation chains with the same operator precedence should either
  // completely break or not at all. E.g. a + b + ccccccccccccc should be
  // "a +\nb +\nccccccccccccc", not "a + b + \nccccccccccccc".
  const shouldFlatten =
    (n.kind === "binaryExpression" &&
      n.lhs.kind === "binaryExpression" &&
      getOpPrecedence(n.lhs.op.tokenType) ===
        getOpPrecedence(n.op.tokenType)) ||
    (n.kind === "commaExpression" && n.lhs.kind === "commaExpression")

  const nOp = n.kind === "binaryExpression" ? n.op.tokenType : TOKEN.COMMA

  let parts: Doc[]
  if (shouldFlatten) {
    // call printBinaryishExpressions to avoid the result being wrapped in group().
    // lhs never needs to be wrapped in paren as we are on same level.
    parts = path.call(
      (path) =>
        printBinaryishExpressions(
          path,
          print,
          path.getValue() as BinaryExpression,
          inMacro,
        ),
      "lhs",
    )

    parts.push(
      " ",
      path.call(print, "op"),
      line,
      paren(
        path.call(print, "rhs"),
        getPrecedence(n.rhs, inMacro) >= getOpPrecedence(nOp),
      ),
    )

    return parts
  } else {
    const lhsDoc = path.call(print, "lhs")
    return [
      paren(lhsDoc, getPrecedence(n.lhs, inMacro) > getOpPrecedence(nOp)),
      n.kind === "commaExpression" ? "," : [" ", path.call(print, "op")],
      line,
      paren(
        path.call(print, "rhs"),
        getPrecedence(n.rhs, inMacro) >= getOpPrecedence(nOp),
      ),
    ]
  }
}

function adjustClause(node: Node, clause: Doc, forceSpace: boolean) {
  if (node.kind === "expressionStatement" && !node.expression) {
    return ";"
  }

  if (node.kind === "compoundStatement" || forceSpace) {
    return [" ", clause]
  }

  return indent([line, clause])
}

function formatMacroDefinition(doc: Doc, options: GlslParserOptions): string {
  const formatted = printDocToString(
    doc,
    Object.assign({}, options, {
      printWidth: options.printWidth - 2,
    }),
  ).formatted
  return formatted
    .trim()
    .replace(
      /^.*(?=[\r\n])/gm,
      (substr: string) =>
        substr + " ".repeat(options.printWidth - 2 - substr.length + 1) + "\\",
    )
}

function printDanglingComments(
  path: AstPath,
  options: GlslParserOptions,
  sameIndent: any,
  filter: (arg0: any) => any,
) {
  const parts: Doc = []
  const node = path.getValue() as Node

  if (!node || !node.comments) {
    return ""
  }

  path.each(() => {
    const comment = path.getValue() as PrettierComment
    if (!comment.leading && !comment.trailing && (!filter || filter(comment))) {
      parts.push(printComment(path, options))
    }
  }, "comments")

  if (parts.length === 0) {
    return ""
  }

  if (sameIndent) {
    return join(hardline, parts)
  }
  return indent([hardline, join(hardline, parts)])
}

function isAssignment(node: Node): node is AssignmentExpression {
  return node.kind === "assignmentExpression"
}

function isAssignmentOrVariableDeclarator(
  node: Node,
): node is AssignmentExpression | Declarator {
  return node.kind === "assignmentExpression" || node.kind === "declarator"
}

function hasLeadingOwnLineComment(
  originalText: string,
  rightNode: Node,
): boolean {
  // TODO
  return false
}

function chooseAssignmentLayout(
  path: AstPath<Node | IToken>,
  options: GlslParserOptions,
  rightNode: Node | undefined,
):
  | "break-after-operator"
  | "chain"
  | "chain-tail"
  | "only-left"
  | "never-break-after-operator"
  | "fluid" {
  if (!rightNode) {
    return "only-left"
  }

  // Short assignment chains (only 2 segments) are NOT formatted as chains.
  //   1) a = b = c; (expression statements)
  //   2) int a = b = c;

  const isTail = !isAssignment(rightNode)
  const shouldUseChainFormatting = path.match(
    isAssignment,
    isAssignmentOrVariableDeclarator,
    (node: Node) =>
      !isTail ||
      (node.kind !== "expressionStatement" &&
        node.kind !== "initDeclaratorListDeclaration"),
  )

  if (shouldUseChainFormatting) {
    return !isTail ? "chain" : "chain-tail"
  }

  const isHeadOfLongChain = !isTail && isAssignment(rightNode.rhs)

  if (
    isHeadOfLongChain ||
    hasLeadingOwnLineComment(options.originalText, rightNode)
  ) {
    return "break-after-operator"
  }

  if (
    rightNode.kind === "binaryExpression" ||
    rightNode.kind === "commaExpression" ||
    (rightNode.kind === "conditionalExpression" &&
      rightNode.condition.kind === "binaryExpression")
  ) {
    return "break-after-operator"
  }

  if (rightNode.kind === "constantExpression") {
    return "never-break-after-operator"
  }

  return "fluid"
}

/**
 * Print an `AssignmentExpression` or a variable `Declarator`.
 */
function printAssignmentLike(
  path: AstPath,
  options: GlslParserOptions,
  leftDoc: Doc,
  operator: Doc,
  rightDoc: Doc,
  rightNode: Node | undefined,
): Doc {
  const layout = chooseAssignmentLayout(path, options, rightNode)
  // TODO: need this group?
  // return group([
  //   name,
  //   arraySpecifier,
  //   " =",
  //   group(indent(line), { id: groupId }),
  //   indentIfBreak(p<typeof n>("init"), { groupId }),
  // ])
  switch (layout) {
    // First break after operator, then the sides are broken independently on their own lines
    case "break-after-operator":
      return group([group(leftDoc), operator, group(indent([line, rightDoc]))])

    // First break right-hand side, then left-hand side
    case "never-break-after-operator":
      return group([group(leftDoc), operator, " ", rightDoc])

    // First break right-hand side, then after operator
    case "fluid": {
      const groupId = Symbol("assignment")
      return group([
        group(leftDoc),
        operator,
        group(indent(line), { id: groupId }),
        lineSuffixBoundary,
        indentIfBreak(rightDoc, { groupId }),
      ])
    }

    // Parts of assignment chains aren't wrapped in groups.
    // Once one of them breaks, the chain breaks too.
    case "chain":
      return [group(leftDoc), operator, line, rightDoc]

    case "chain-tail":
      return [group(leftDoc), operator, indent([line, rightDoc])]

    case "only-left":
      return leftDoc
    default:
      throw new Error()
  }
}

type GlslParserOptions = ParserOptions<Node | IToken> & { inMacro?: Token[] }

export const printers: Plugin<Node | IToken>["printers"] = {
  "glsl-ast": {
    print(path, options: GlslParserOptions, print): Doc {
      const inMacro = options.inMacro
      const n = path.getValue()
      if (!n) {
        return []
      }
      if (isToken(n)) {
        return n.image
      }
      const p = <N extends Node>(s: keyof N) => path.call(print, s)

      /**
       * Print function calls to mat* with literals as a grid.
       */
      function printFunctionCall(n: FunctionCall): Doc {
        const argDocs = path.map(print, "args")
        let mDim
        let argParts: Doc[] | undefined
        if (
          n.callee.arraySpecifier === undefined &&
          isToken(n.callee.typeSpecifierNonArray) &&
          (mDim = getMatrixDimensions(
            n.callee.typeSpecifierNonArray.tokenType,
          )) !== undefined &&
          mDim[0] * mDim[1] === n.args.length
        ) {
          const allArgsAreConstants = n.args.every(
            (e) =>
              (e.kind === "constantExpression" &&
                (e.const_.tokenType === TOKEN.FLOATCONSTANT ||
                  e.const_.tokenType === TOKEN.INTCONSTANT)) ||
              (e.kind === "unaryExpression" &&
                (e.op.tokenType === TOKEN.PLUS ||
                  e.op.tokenType === TOKEN.DASH) &&
                e.on.kind === "constantExpression" &&
                (e.on.const_.tokenType === TOKEN.FLOATCONSTANT ||
                  e.on.const_.tokenType === TOKEN.INTCONSTANT)),
          )
          if (allArgsAreConstants) {
            const suffixes: number[] = []
            const prefixes: number[] = []
            let maxPrefix = 0
            let maxSuffix = 0
            for (let i = 0; i < n.args.length; i++) {
              const printedArg = argDocs[i]
              let periodIndex =
                typeof printedArg === "string"
                  ? printedArg.indexOf(".")
                  : 1 + (printedArg as string[])[1].indexOf(".")
              if (periodIndex === -1) {
                periodIndex =
                  typeof printedArg === "string"
                    ? printedArg.length
                    : 1 + (printedArg as string[])[1].length
              }
              prefixes[i] = periodIndex
              suffixes[i] =
                (typeof printedArg === "string"
                  ? printedArg.length
                  : 1 + (printedArg as string[])[1].length) - periodIndex
              maxPrefix = Math.max(maxPrefix, prefixes[i])
              maxSuffix = Math.max(maxSuffix, suffixes[i])
            }
            argParts = []
            const colCount = mDim[0]
            for (let i = 0; i < argDocs.length; i++) {
              const leftPad = maxPrefix - prefixes[i]
              const rightPad = maxSuffix - suffixes[i]
              const alignedArg =
                leftPad === 0 && rightPad === 0
                  ? argDocs[i]
                  : [" ".repeat(leftPad), argDocs[i], " ".repeat(rightPad)]
              argParts.push(i % colCount === 0 ? hardline : " ")
              argParts.push(alignedArg)
              if (i !== argDocs.length - 1) {
                argParts.push(",")
              }
            }
          }
        }
        if (!argParts) {
          argParts = [softline, join([",", line], argDocs)]
        }
        return group([
          p<typeof n>("callee"),
          "(",
          indent(argParts),
          softline,
          ")",
        ])
      }

      try {
        switch (n.kind) {
          ////////// DECLARATIONS
          case "translationUnit": {
            const parts: Doc = []
            path.each((path, _index) => {
              const value = path.getValue()
              parts.push(print(path))
              if (util.isNextLineEmpty(options.originalText, value, locEnd)) {
                parts.push(hardline)
              }
              parts.push(hardline)
            }, "declarations")
            return parts
          }
          case "precisionDeclaration":
            return [
              "precision ",
              n.precisionQualifier.image,
              " ",
              path.call(print, "typeSpecifierNoPrec"),
              ";",
            ]
          case "fullySpecifiedType": {
            const parts: Doc = []
            if (n.typeQualifier) {
              parts.push(p<typeof n>("typeQualifier"), " ")
            }
            parts.push(p<typeof n>("typeSpecifier"))
            return parts
          }
          case "typeSpecifier": {
            const parts: Doc = []
            if (n.precisionQualifier) {
              parts.push(n.precisionQualifier.image, " ")
            }
            parts.push(p<typeof n>("typeSpecifierNonArray"))
            if (n.arraySpecifier) {
              parts.push(p<typeof n>("arraySpecifier"))
            }
            return parts
          }
          case "typeQualifier": {
            const parts: Doc = []
            if (n.invariantQualifier) {
              parts.push("invariant")
            }
            if (n.interpolationQualifier) {
              parts.push(n.interpolationQualifier.image)
            }
            if (n.layoutQualifier) {
              parts.push(p<typeof n>("layoutQualifier"))
            }
            if (n.storageQualifier) {
              parts.push(p<typeof n>("storageQualifier"))
            }
            return join(" ", parts)
          }
          case "storageQualifier": {
            const parts: Doc = []
            if (n.CONST) {
              parts.push("const")
            }
            // SPEC: "A variable may be qualified as flat centroid, which will
            // mean the same thing as qualifying it only as flat."
            // Normalize to just flat.
            if (
              n.CENTROID &&
              (path.getParentNode() as TypeQualifier).interpolationQualifier
                ?.tokenType !== TOKEN.FLAT
            ) {
              parts.push("centroid")
            }
            if (n.IN) {
              parts.push("in")
            }
            if (n.OUT) {
              parts.push("out")
            }
            if (n.VARYING) {
              parts.push("varying")
            }
            if (n.ATTRIBUTE) {
              parts.push("attribute")
            }
            if (n.UNIFORM) {
              parts.push("uniform")
            }
            return join(" ", parts)
          }
          case "functionPrototype":
          case "functionDefinition":
            return [
              group([
                p<typeof n>("returnType"),
                " ",
                p<typeof n>("name"),
                "(",
                indent([
                  softline,
                  join([",", line], path.map(print, "params")),
                ]),
                softline,
                ")",
              ]),
              n.kind === "functionPrototype" ? ";" : [" ", p<typeof n>("body")],
            ]
          case "parameterDeclaration":
            return [
              n.parameterTypeQualifier
                ? [p<typeof n>("parameterTypeQualifier"), " "]
                : "",
              n.parameterQualifier?.tokenType === TOKEN.OUT ||
              n.parameterQualifier?.tokenType === TOKEN.INOUT
                ? n.parameterQualifier?.image + " "
                : "",
              p<typeof n>("typeSpecifier"),
              " ",
              p<typeof n>("pName"),
              p<typeof n>("arraySpecifier"),
            ]
          case "initDeclaratorListDeclaration":
          case "structDeclaration": {
            const printed = path.map(print, "declarators")

            const parentNode = path.getParentNode() as Node
            const isParentForLoop = parentNode.kind === "forStatement"
            const hasInit = n.declarators.some((decl) => decl.init)

            // If we have multiple declarations, or if the only declaration is
            // on its own line due to a comment, indent the declarations.
            // TODO: hasComment?
            return group([
              p<typeof n>("fsType"),
              printed.length === 0 ? "" : " ",
              printed.length === 1
                ? printed
                : group(
                    indent(
                      join(
                        [",", hasInit && !isParentForLoop ? hardline : line],
                        printed,
                      ),
                    ),
                  ),
              ";",
            ])
          }

          case "declarator": {
            const arraySpecifier = p<typeof n>("arraySpecifier")
            const leftDoc = [n.name.image, arraySpecifier]
            return printAssignmentLike(
              path,
              options,
              leftDoc,
              " =",
              p<typeof n>("init"),
              n.init,
            )
          }
          case "arraySpecifier":
            return group([
              "[",
              indent([softline, p<typeof n>("size")]),
              softline,
              "]",
            ])
          case "arrayAccess":
            return [
              paren(p<typeof n>("on"), getPrecedence(n.on, inMacro) > 2),
              "[",
              p<typeof n>("index"),
              "]",
            ]
          case "structSpecifier": {
            const parts: Doc = []
            path.each((path, index, declarations: StructDeclaration[]) => {
              const value = path.getValue()
              parts.push(hardline)
              parts.push(print(path))
              if (
                index !== declarations.length - 1 &&
                util.isNextLineEmpty(options.originalText, value, locEnd)
              ) {
                parts.push(hardline)
              }
            }, "declarations")
            return group([
              "struct",
              n.name ? " " + n.name.image : "",
              " {",
              indent(parts),
              hardline,
              "}",
            ])
          }

          ///////// STATEMENTS
          case "compoundStatement": {
            const parts: Doc = []

            const nodeHasComment = !!n.comments?.some(
              (c) => !c.leading && !c.trailing && !c.printed,
            )

            path.each((path, index) => {
              const value = path.getValue()
              if (index !== 0) {
                parts.push(hardline)
              }
              parts.push(print(path))
              if (util.isNextLineEmpty(options.originalText, value, locEnd)) {
                parts.push(hardline)
              }
            }, "statements")

            // print dangling comments
            if (nodeHasComment) {
              path.each((path) => {
                const comment = path.getValue() as unknown as PrettierComment
                if (!comment.leading && !comment.trailing) {
                  parts.push(print(path))
                  comment.printed = true
                }
              }, "comments")
            }

            return group([
              "{",
              parts.length ? [indent([hardline, parts]), hardline] : "",
              "}",
            ])
          }
          case "returnStatement": {
            if (n.what) {
              const what = p<typeof n>("what")
              return ["return", " ", what, ";"]
            } else {
              return "return;"
            }
            // return ["return", " ", conditionalGroup([what, indent(what)]), ";"]
          }
          case "breakStatement":
            return "break;"
          case "continueStatement":
            return "continue;"
          case "discardStatement":
            return "discard;"
          case "selectionStatement": {
            const parts: Doc[] = []
            const yes = adjustClause(n.yes, p<typeof n>("yes"), false)
            const opening = group([
              "if (",
              group([indent([softline, p<typeof n>("condition")]), softline]),
              ")",
              yes,
            ])
            parts.push(opening)
            if (n.no) {
              const commentOnOwnLine =
                n.yes.comments?.some(
                  (c) => c.trailing && c.tokenType === TOKEN.LINE_COMMENT,
                ) ||
                findLast(n.yes.comments, (c) => !c.leading && !c.trailing)
                  ?.tokenType === TOKEN.LINE_COMMENT
              const elseOnSameLine =
                n.yes.kind === "compoundStatement" && !commentOnOwnLine
              parts.push(elseOnSameLine ? " " : hardline)
              parts.push(
                "else",
                group(
                  adjustClause(
                    n.no,
                    p<typeof n>("no"),
                    n.no.kind === "selectionStatement",
                  ),
                ),
              )
            }
            return parts
          }
          case "forStatement": {
            const statement = adjustClause(
              n.statement,
              p<typeof n>("statement"),
              false,
            )

            // We want to keep dangling comments above the loop to stay consistent.
            // Any comment positioned between the for statement and the parentheses
            // is going to be printed before the statement.
            // const dangling = printDanglingComments(
            //   path,
            //   options,
            //   /* sameLine */ true,
            // )
            // TODO
            const dangling = false
            const printedComments = dangling ? [dangling, softline] : ""

            if (
              n.initExpression.kind === "expressionStatement" &&
              !n.initExpression.expression &&
              !n.conditionExpression &&
              !n.loopExpression
            ) {
              return [printedComments, group(["for (;;)", statement])]
            }
            return [
              printedComments,
              group([
                "for (",
                group([
                  indent([
                    softline,
                    p<typeof n>("initExpression"),
                    line,
                    p<typeof n>("conditionExpression"),
                    ";",
                    line,
                    p<typeof n>("loopExpression"),
                  ]),
                  softline,
                ]),
                ")",
                statement,
              ]),
            ]
          }
          case "whileStatement": {
            const statement = adjustClause(
              n.statement,
              p<typeof n>("statement"),
              false,
            )
            return [
              "while (",
              group(p<typeof n>("conditionExpression")),
              ")",
              statement,
            ]
          }
          case "doWhileStatement":
            return [
              "do ",
              p<typeof n>("statement"),
              " while (",
              group(p<typeof n>("conditionExpression")),
              ");",
            ]

          ////////// EXPRESSIONS
          case "functionCall":
            return printFunctionCall(n)
          case "methodCall":
            return [
              paren(p<typeof n>("on"), getPrecedence(n.on, inMacro) > 2),
              ".",
              p<typeof n>("functionCall"),
            ]
          case "postfixExpression":
            return [
              paren(p<typeof n>("on"), getPrecedence(n.on, inMacro) > 2),
              p<typeof n>("op"),
            ]
          case "unaryExpression":
            return [
              p<typeof n>("op"),
              paren(p<typeof n>("on"), getPrecedence(n.on, inMacro) > 3),
            ]
          case "assignmentExpression": {
            const leftDoc = p<typeof n>("lhs")
            return printAssignmentLike(
              path,
              options,
              leftDoc,
              " " + n.op.image,
              p<typeof n>("rhs"),
              n.rhs,
            )
          }
          case "conditionalExpression":
            return [
              paren(
                p<typeof n>("condition"),
                getPrecedence(n.condition, inMacro) >= 15,
              ),
              indent([
                line,
                "? ",
                p<typeof n>("yes"),
                line,
                ": ",
                p<typeof n>("no"),
              ]),
            ]
          case "commaExpression":
          case "binaryExpression": {
            const parts = printBinaryishExpressions(path, print, n, inMacro)
            const parent = path.getParentNode() as Node
            const isInsideParenthesis =
              parent.kind === "selectionStatement" ||
              parent.kind === "whileStatement" ||
              parent.kind === "switchStatement" ||
              parent.kind === "doWhileStatement"

            // if (
            //   this.hasPlugin("dynamicImports") && this.lookahead().type === tt.parenLeft
            // ) {
            //
            // looks super weird, we want to break the children if the parent breaks
            //
            // if (
            //   this.hasPlugin("dynamicImports") &&
            //   this.lookahead().type === tt.parenLeft
            // ) {
            if (isInsideParenthesis) {
              return parts
            }

            const needsParen = () => {
              const parent = path.getParentNode() as Node | undefined
              if (!parent) {
                return false
              }

              // Comma expressions passed as arguments need parentheses.
              // E.g. foo((a, b), c)
              if (
                parent.kind === "functionCall" &&
                n.kind === "commaExpression"
              ) {
                return true
              }

              // Bitwise operators are wrapped in parentheses for clarity.
              // E.g. a << (u & 16)
              if (
                parent.kind === "binaryExpression" &&
                isBitwiseOperator(parent.op.tokenType)
              ) {
                return true
              }

              return false
            }

            const parentParent = path.getParentNode(1) as Node

            // Avoid indenting sub-expressions in some cases where the first sub-expression is already
            // indented accordingly. We should indent sub-expressions where the first case isn't indented.
            const shouldNotIndent =
              parent.kind === "returnStatement" ||
              parent.kind === "forStatement" ||
              (parent.kind === "conditionalExpression" &&
                parentParent.kind !== "returnStatement" &&
                parentParent.kind !== "functionCall") ||
              parent.kind === "assignmentExpression" ||
              parent.kind === "declarator"
            if (shouldNotIndent) {
              return group(parts)
            } else {
              // Separate the leftmost expression, possibly with its leading comments.
              const headParts = parts.slice(0, 1)
              const rest = parts.slice(headParts.length)

              return group(
                paren(
                  [
                    // Don't include the initial expression in the indentation
                    // level. The first item is guaranteed to be the first
                    // left-most expression.
                    ...headParts,
                    indent(rest),
                  ],
                  needsParen(),
                ),
              )
            }
          }

          case "expressionStatement":
            return [p<typeof n>("expression"), ";"]
          case "fieldAccess":
            return [
              paren(p<typeof n>("on"), getPrecedence(n.on, inMacro) > 2),
              ".",
              p<typeof n>("field"),
            ]
          case "constantExpression": {
            const c = n.const_
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
              p<typeof n>("what"),
              n.params
                ? ["(", join([", "], path.map(print, "params")), ")"]
                : "",
              indent([
                line,
                n.node
                  ? paren(p<typeof n>("node"), isExpression(n.node))
                  : fill(join(line, path.map(print, "tokens"))),
              ]),
            ])
            options.inMacro = undefined
            return formatMacroDefinition(doc, options)
          }
          case "ppDir": {
            return formatMacroDefinition(
              group([
                "#",
                n.dir.image,
                " ",
                indent(
                  n.node
                    ? p<typeof n>("node")
                    : fill(join(line, path.map(print, "tokens"))),
                ),
              ]),
              options,
            )
          }
          case "ppPragma":
            return n.dir.image
              .replace(/^#\s+/, "#")
              .replace(/^#pragma\s{2,}/, "#pragma ")
          case "ppCall": {
            return group([
              n.callee.image,
              "(",
              join(
                [",", line],
                path.map(
                  (
                    path: AstPath<Node | IToken>,
                    index: number,
                    value: { tokens: Token[]; node: Node | undefined }[],
                  ): doc.builders.Doc => {
                    return value[index].tokens.map((t) => t.image)
                  },
                  "args",
                ),
              ),
              ")",
            ])
          }
          case "ppInclude":
            return ["#include ", n.what]
          case "switchStatement": {
            return [
              "switch (",
              group([
                indent([softline, p<typeof n>("initExpression")]),
                softline,
              ]),
              ") {",
              n.cases.length
                ? indent([hardline, join(hardline, path.map(print, "cases"))])
                : "",
              hardline,
              "}",
            ]
          }
          case "caseBlock": {
            const caseLabel = p<typeof n>("caseLabel")
            const parts: Doc = []
            path.each((path, index) => {
              const value = path.getValue()
              parts.push(hardline)
              parts.push(print(path))
              if (util.isNextLineEmpty(options.originalText, value, locEnd)) {
                parts.push(hardline)
              }
            }, "statements")
            return [caseLabel, indent(parts)]
          }
          case "caseLabel": {
            return n.case_ === undefined
              ? "default:"
              : ["case ", p<typeof n>("case_"), ":"]
          }
          case "layoutQualifier":
            return [
              "layout(",
              join(
                ", ",
                n.layoutQualifierIds.map((lqi): Doc => {
                  return lqi.init === undefined
                    ? lqi.IDENTIFIER.image
                    : [lqi.IDENTIFIER.image, " = ", lqi.init.image]
                }),
              ),
              ")",
            ]
          case "uniformBlock":
            return [
              p<typeof n>("typeQualifier"),
              " ",
              n.blockName.image,
              " {",
              indent([
                hardline,
                join(hardline, path.map(print, "declarations")),
              ]),
              hardline,
              "};",
            ]
          case "typeQualifierDeclaration":
            return [p<typeof n>("typeQualifier"), ";"]
          default:
            throw new Error(
              "unexpected n type " +
                n.kind +
                "\n" +
                JSON.stringify(n).substring(0, 100),
            )
        }
      } catch (e) {
        console.error(
          "error printing " + JSON.stringify(n).substring(0, 100) + "\n",
        )
        throw e
      }
    },
    embed(
      path: AstPath,
      options: Options,
    ):
      | null
      | ((
          textToDoc: (text: string, options: Options) => Promise<Doc>,
          print: (
            selector?: string | number | Array<string | number> | AstPath,
          ) => Doc,
          path: AstPath,
          options: Options,
        ) => Promise<Doc | undefined> | Doc | undefined) {
      const node = path.getValue() as Node | Token
      if (
        !isToken(node) ||
        (node.tokenType !== TOKEN.LINE_COMMENT &&
          node.tokenType !== TOKEN.MULTILINE_COMMENT)
      ) {
        return null
      }
      return (textToDoc, print, path, options) => {}
    },

    getCommentChildNodes(node: Node | Token): Node[] {
      return isToken(node) ? [] : CHILDREN_VISITOR.visit(node)!
    },
    canAttachComment(_node) {
      return true
    },
    printComment,
    hasPrettierIgnore(path: AstPath<IToken | Node>) {
      const value = path.getValue()
      return (
        (value &&
          isNode(value) &&
          value.comments?.some((c) =>
            /\/\/\s*prettier-ignore\b.*/.test(c.image),
          )) ??
        false
      )
    },
  },
}

function printComment(
  // Path to the current comment node
  commentPath: AstPath,
  // Current options
  options: GlslParserOptions,
): Doc {
  const n = commentPath.getValue() as Token
  if (n.tokenType === TOKEN.MULTILINE_COMMENT && n.image[2] === "*") {
    const src = n.image
      .substring(3, n.image.length - 2)
      .split("\n")
      .map((l: string) =>
        l === " *" ? "" : l.startsWith(" * ") ? l.substring(3) : l,
      )
      .join("\n")
      .trim()
    // const formattedComment: string = await format(src, {
    //   ...options,
    //   printWidth: options.printWidth - 3,
    //   parser: "markdown",
    //   proseWrap: "always",
    //   plugins: [],
    // })
    const formattedComment = src
    const formattedCommentLines = formattedComment.split("\n")
    // Remove the final newline which markdown formatter always adds.
    // formattedCommentLines.pop()

    return (
      "/**\n" +
      formattedCommentLines
        .map((l) => (l === "" ? " *" : " * " + l))
        .join("\n") +
      "\n */"
    )
  }
  return n.image
}
