import { EOF } from "chevrotain"
import { noop } from "lodash"

import {
  AbstractVisitor,
  BinaryExpression,
  ConstantExpression,
  Node,
  Token,
  UnaryExpression,
  VariableExpression,
} from "./nodes"
import { doOp, lex, TOKEN } from "./lexer"
import { checkParsingErrors, GLSL_PARSER } from "./parser"
import { CheckError, mapExpandedLocation } from "./util"

type MarkErrorFunc = (code: string, where: Token, message: string) => void
type int32 = number
const PREPROC_EVALUATOR = new (class extends AbstractVisitor<int32> {
  private markError: MarkErrorFunc = noop
  private isDefined!: (macroName: string) => boolean

  public eval(
    n: Node,
    isDefined: (macroName: string) => boolean,
    markError: MarkErrorFunc,
  ) {
    this.isDefined = isDefined
    this.markError = markError
    return super.visit(n)!
  }

  protected constantExpression(n: ConstantExpression): int32 {
    if (n.const_.tokenType !== TOKEN.INTCONSTANT) {
      throw new Error("XX")
    }
    return +n.const_.image
  }

  protected unaryExpression(n: UnaryExpression): int32 {
    switch (n.op.tokenType) {
      case TOKEN.NON_PP_IDENTIFIER:
        // must be "defined"
        return +this.isDefined((n.on as VariableExpression).var.image)
      case TOKEN.DASH:
        return -this.visit(n.on)!
      case TOKEN.TILDE:
        return ~this.visit(n.on)!
      case TOKEN.BANG:
        return +!this.visit(n.on)!
      case TOKEN.PLUS:
        return this.visit(n.on)!
      default:
        throw new Error(n.op.tokenType.name)
    }
  }

  protected binaryExpression(n: BinaryExpression): int32 {
    const l = this.visit(n.lhs)!
    switch (n.op.tokenType) {
      case TOKEN.AND_OP:
        return l && this.visit(n.rhs)!
      case TOKEN.OR_OP:
        return l || this.visit(n.rhs)!
      default: {
        const r = this.visit(n.rhs)
        return doOp(n.op.tokenType, l, r) | 0
      }
    }
  }

  protected variableExpression(_n: VariableExpression): int32 | undefined {
    // We have already preprocessed the ppConstantExpression at this point.
    // If there are any "variables" left, it means they were not defined. This
    // is not valid in GLSL ES 3.0, so we output an error.
    this.markError("P0001", _n.var, "undefined identifier " + _n.var.image)
    return 0
  }
})()

function isPreprocIdentifier(t: Token) {
  return (
    t.tokenType === TOKEN.NON_PP_IDENTIFIER ||
    t.tokenType.CATEGORIES?.includes(TOKEN.KEYWORD) ||
    t.tokenType.CATEGORIES?.includes(TOKEN.BASIC_TYPE)
  )
}

type SourceMap = {
  columnDiff: number
  lineDiff: number
  newOffset: number
  originalOffset: number
  length: number
}

function charsToStartOfLine(input: string, offset: number): number {
  let i = offset
  while (i >= 0 && input[i] !== "\r" && input[i] !== "\n") {
    i--
  }
  return offset - i - 1
}

export function applyLineContinuations(input: string): {
  result: string
  changes: SourceMap[]
} {
  const changes: SourceMap[] = []
  let newlines = ""
  let newlinesCount = 0
  let columnDiff = 0

  const result = input.replace(
    /\\(\r\n|\n\r|\r|\n)(.*?)(?:(?=\\?[\r\n])|$)/g,
    (substring, nl: string, nonWhitespace: string, offset: number) => {
      newlinesCount++
      columnDiff += charsToStartOfLine(input, offset)
      changes.push({
        originalOffset: offset + 1 + nl.length,
        newOffset: offset - newlines.length,
        length: nonWhitespace.length,
        lineDiff: -newlinesCount,
        columnDiff,
      })
      newlines += " " + nl // space to replace \
      let resultNewlines = ""
      if (
        !(
          input.length > offset + substring.length &&
          input[offset + substring.length] === "\\"
        )
      ) {
        resultNewlines = newlines
        newlines = ""
        newlinesCount = 0
        columnDiff = 0
      }
      return nonWhitespace + resultNewlines
    },
  )
  return { result, changes }
}

export function fixLocations(tokens: Token[], changes: SourceMap[]): void {
  let tokensIdx = 0

  function fixLocation(token: Token, change: SourceMap): void {
    const offsetDiff = change.originalOffset - change.newOffset
    if (token.startOffset >= change.newOffset) {
      token.lineNoCont = token.startLine
      token.startOffset += offsetDiff
      token.startLine! -= change.lineDiff
      token.startColumn! -= change.columnDiff
    }

    token.endOffset! += offsetDiff
    token.endLine! -= change.lineDiff
    token.endColumn! -= change.columnDiff
  }

  for (const change of changes) {
    // skip tokens before this change
    while (
      tokens[tokensIdx] &&
      tokens[tokensIdx].endOffset! < change.newOffset
    ) {
      tokensIdx++
    }
    // fix location on all tokens inside this location
    while (
      tokens[tokensIdx] &&
      tokens[tokensIdx].startOffset < change.newOffset + change.length
    ) {
      fixLocation(tokens[tokensIdx], change)
      tokensIdx++
    }
  }
}

// A NEWLINE is one of
// CR LF
// LF CR
// CR
// LF
function onSameLine(input: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const ci = input[i]
    if (ci === "\\") {
      if (i + 1 < end) {
        const ci1 = input[i + 1]
        if (ci1 === "\n") {
          i += i + 2 < end && input[i + 2] === "\r" ? 3 : 2
        } else if (ci1 === "\r") {
          i += i + 2 < end && input[i + 2] === "\n" ? 3 : 2
        }
      }
    }
    if (ci === "\n" || ci === "\r") {
      return false
    }
  }
  return true
}

function findNextNewline(input: string, start: number, end: number): number {
  for (let i = start; i < end; i++) {
    const ci = input[i]
    if (ci === "\\") {
      if (i + 1 < end) {
        const ci1 = input[i + 1]
        if (ci1 === "\n") {
          i += i + 2 < end && input[i + 2] === "\r" ? 2 : 1
        } else if (ci1 === "\r") {
          i += i + 2 < end && input[i + 2] === "\n" ? 2 : 1
        }
      }
    }
    if (ci === "/" && i + 1 < end) {
      if (input[i + 1] === "*") {
        // multiline comment
        i += 2
        while (
          i < end &&
          input[i] !== "*" &&
          i + 1 < end &&
          input[i + 1] !== "/"
        ) {
          i++
        }
        if (i < end) {
          i++
        }
      } else if (input[i + 1] === "/") {
        i += 2
        while (i < end && (input[i] !== "\n" || input[i] !== "\r")) {
          i++
        }
      }
    }
    if (ci === "\n" || ci === "\r") {
      return i
    }
  }
  return -1
}

function performFunctionMacroInlining(
  { params, tokens }: { kind: "function"; params: string[]; tokens: Token[] },
  args: Token[][],
  macroInvocation: Token,
): Token[] {
  const result: Token[] = []
  for (const t of tokens) {
    const paramIndex = params.indexOf(t.image)
    if (isPreprocIdentifier(t) && paramIndex !== -1) {
      // TODO: add trace here too
      result.push(...args[paramIndex])
    } else {
      result.push(macroifyToken(t, macroInvocation))
    }
  }
  return result
}

function macroifyToken(
  t: Token,
  macroSource: Token,
): Token & { macroSource: Token } {
  return Object.assign({}, t, { macroSource })
}

export function preproc(input: string): Token[] {
  const noLineCont = applyLineContinuations(input)
  const tokens = lex(noLineCont.result)
  fixLocations(tokens, noLineCont.changes)
  return preprocMacros(tokens)
}

type MacroDefinitions = Record<
  string,
  | {
      kind: "function"
      params: string[]
      tokens: Token[]
      definition: Token
    }
  | {
      kind: "object"
      tokens: Token[]
      definition: Token
    }
>
const BUILT_IN_MACROS: ReadonlyArray<string> = [
  "__LINE__",
  "__FILE__",
  "__VERSION__",
  "GL_ES",
]

function makeIntConstantToken(image: string, token: Token): Token {
  return Object.assign({}, token, {
    image: image,
    tokenType: TOKEN.INTCONSTANT,
    tokenTypeIdx: TOKEN.INTCONSTANT.tokenTypeIdx!,
    macroSource: token,
  })
}

type StartEnd = [start: number, end: number]

export function preprocMacros(
  tokens: Token[],
  start = 0,
  definitions: MacroDefinitions = {},
  errors: CheckError[] = [],
  // After replacement of a macro, we want to avoid recursively replacing
  // the same macro infinitely.
  blockedReplacements: { macroName: string; start: number; end: number }[] = [],
  blockedReplacementsOffset = 0,
): Token[] {
  const result: Token[] = []

  function markError(code: string, where: Token, message: string): void {
    errors.push({
      code,
      error: new Error(message),
      loc: mapExpandedLocation(where),
      message,
      where,
    })
  }

  function getLastTokenOnLine(startTokenIdx: number): number {
    let lastTokenOnLine = startTokenIdx
    while (
      lastTokenOnLine + 1 < tokens.length &&
      (tokens[lastTokenOnLine].lineNoCont ??
        tokens[lastTokenOnLine].startLine) ===
        (tokens[lastTokenOnLine + 1].lineNoCont ??
          tokens[lastTokenOnLine + 1].startLine)
    ) {
      lastTokenOnLine++
    }
    return lastTokenOnLine
  }

  function parseAndEvalPPConstantExpressionOnLine(
    i: number,
  ): [newI: number, result: number] {
    const end = getLastTokenOnLine(i) + 1
    const input = tokens.slice(i + 1, end)
    const preprocessedInput = preprocMacros(
      input,
      0,
      definitions,
      errors,
      blockedReplacements,
      blockedReplacementsOffset + i + 1,
    )
    GLSL_PARSER.input = preprocessedInput
    const ast = GLSL_PARSER.ppConstantExpression()
    checkParsingErrors("", GLSL_PARSER.errors)
    const conditionValue = PREPROC_EVALUATOR.eval(
      ast,
      (macro) => !!definitions[macro],
      markError,
    )
    return [end, conditionValue]
  }

  function parseMacroArgs(
    tokens: Token[],
    start: number,
  ): [newI: number, args: StartEnd[]] {
    let i = start
    i++ // skip LEFT_PAREN
    const params: StartEnd[] = []
    let currentParamStart = i
    let depth = 0
    while (i < tokens.length) {
      const t = tokens[i]
      if (depth === 0 && t.tokenType === TOKEN.COMMA) {
        params.push([currentParamStart, i])
        currentParamStart = i + 1
      } else if (depth === 0 && t.tokenType === TOKEN.RIGHT_PAREN) {
        params.push([currentParamStart, i])
        i++
        return [i, params]
      } else {
        if (t.tokenType === TOKEN.LEFT_PAREN) {
          depth++
        } else if (t.tokenType === TOKEN.RIGHT_PAREN) {
          depth--
        }
      }
      i++
    }
    throw new Error()
  }

  let i = 0

  // la = lookahead
  function la(by = 0): Token {
    return tokens[i + by] ?? EOF
  }

  function preprocIfBlock(outputting: boolean): void {
    let keptLineBlock = false
    const lastTokenOnLine = getLastTokenOnLine(i)
    if (outputting) {
      if (la().image === "if") {
        const [newI, conditionValue] = parseAndEvalPPConstantExpressionOnLine(i)
        i = newI
        keptLineBlock = conditionValue !== 0
      } else {
        if (lastTokenOnLine !== i + 1) {
          markError(
            "P0001",
            la(),
            "#ifdef/#ifndef must have exactly one argument",
          )
        }
        const argToken = tokens[i + 1]
        keptLineBlock =
          !!definitions[argToken.image] === (la().image === "ifdef")
      }
    }
    i = lastTokenOnLine + 1
    recurse(keptLineBlock)
    while (la().image === "elif") {
      let keepElifLineBlock = false
      if (outputting && !keptLineBlock) {
        // eval elif condition
        const [newI, conditionValue] = parseAndEvalPPConstantExpressionOnLine(i)
        i = newI
        keepElifLineBlock = conditionValue !== 0
      }
      keptLineBlock ||= keepElifLineBlock
      recurse(keepElifLineBlock)
    }
    if (la().image === "else") {
      i++
      // todo: expect no tokens until end of line
      recurse(outputting && !keptLineBlock)
    }
    if (la().image !== "endif") {
      throw new Error("should not be possible to reach this")
    }
  }

  function preprocDefineBlock(): void {
    const lastTokenOnLine = getLastTokenOnLine(i)
    if (lastTokenOnLine === i) {
      // TODO: two arguments?
      markError("P0001", la(), "#define needs at least one argument")
    } else {
      const name = tokens[i + 1]
      if (name.image.startsWith("GL_")) {
        markError("P0001", name, "macro name starting with GL_ is not allowed")
      }
      if (BUILT_IN_MACROS.includes(name.image)) {
        markError("P0001", name, "cannot redefine built-in macro")
      } else {
        // function macro if no space between name and LEFT_PAREN
        const isFunctionMacro =
          tokens.length > i + 2 &&
          tokens[i + 2].tokenType === TOKEN.LEFT_PAREN &&
          tokens[i + 1].endOffset === tokens[i + 2].startOffset - 1
        if (isFunctionMacro) {
          const params = []
          let j = i + 3
          if (isPreprocIdentifier(tokens[j])) {
            params.push(tokens[j].image)
            j++
            while (tokens[j].tokenType === TOKEN.COMMA) {
              j++
              if (!isPreprocIdentifier(tokens[j])) {
                markError("P0001", tokens[j], "expected ',' or ')")
                break
              }
              params.push(tokens[j].image)
              j++
            }
          }
          if (tokens[j].tokenType !== TOKEN.RIGHT_PAREN) {
            markError("P0001", tokens[j], "expected ',' or ')'")
          }
          j++
          definitions[name.image] = {
            kind: "function",
            params,
            tokens: tokens.slice(j, lastTokenOnLine + 1),
            definition: name,
          }
        } else {
          definitions[name.image] = {
            kind: "object",
            tokens: tokens.slice(i + 2, lastTokenOnLine + 1),
            definition: name,
          }
        }
      }
      i = lastTokenOnLine
    }
  }

  function recurse(outputting: boolean): void {
    for (; i < tokens.length; i++) {
      if (la().tokenType === TOKEN.HASH) {
        if (i > 0 && la(-1).endLine === la().startLine) {
          markError(
            "P0001",
            la(),
            "preprocessor directives may only be preceded by whitespace",
          )
        }
        const lastTokenOnLine = getLastTokenOnLine(i)
        if (lastTokenOnLine === i) {
          // no tokens, returns
          continue
        }
        i++
        if (outputting && la().image === "define") {
          preprocDefineBlock()
        } else if (outputting && la().image === "undef") {
          const lastTokenOnLine = getLastTokenOnLine(i)
          if (lastTokenOnLine === i) {
            markError("P0001", la(), "#undef needs exactly one parameter")
          } else {
            const name = tokens[i + 1]
            if (BUILT_IN_MACROS.includes(name.image)) {
              markError("P0001", name, "cannot undefine built-in macro")
            } else {
              delete definitions[name.image]
            }
            i = lastTokenOnLine
          }
        } else if (la().image === "version" || la().image === "pragma") {
          // just skip over it
          i = getLastTokenOnLine(i)
        } else if (
          la().image === "if" ||
          la().image === "ifdef" ||
          la().image === "ifndef"
        ) {
          preprocIfBlock(outputting)
        } else if (
          la().image === "endif" ||
          la().image === "elif" ||
          la().image === "else"
        ) {
          return
        } else if (outputting) {
          markError(
            "P0001",
            la(),
            `unknown preprocessor directive '${la().image}'`,
          )
        }
      } else if (outputting) {
        const token = la()
        let replacement
        if (
          isPreprocIdentifier(token) &&
          !blockedReplacements.some(
            ({ macroName, start, end }) =>
              token.image === macroName &&
              start <= blockedReplacementsOffset + i &&
              blockedReplacementsOffset + i < end,
          )
        ) {
          const definition = definitions[token.image]
          const start = i
          if (definition) {
            if (definition.kind === "object") {
              i++
              replacement = definition.tokens.map((t) =>
                macroifyToken(t, token),
              )
            } else {
              if (
                i + 1 < tokens.length &&
                tokens[i + 1].tokenType === TOKEN.LEFT_PAREN
              ) {
                i++
                const [newI, args] = parseMacroArgs(tokens, i)
                i = newI
                const preprocArgs = args.map(([s, e]) =>
                  s === e
                    ? []
                    : preprocMacros(
                        tokens.slice(s, e),
                        0,
                        definitions,
                        errors,
                        blockedReplacements,
                        blockedReplacementsOffset + s,
                      ),
                )
                if (
                  definition.params.length === 0
                    ? args[0][0] !== args[0][1]
                    : definition.params.length !== args.length
                ) {
                  markError(
                    "P0001",
                    token,
                    `incorrect number of arguments, expected ${definition.params.length}, was ${args.length}`,
                  )
                }
                replacement = performFunctionMacroInlining(
                  definition,
                  preprocArgs,
                  token,
                )
              }
            }
          } else if (token.image === "__LINE__") {
            i++
            replacement = [makeIntConstantToken("" + token.startLine, token)]
          } else if (token.image === "GL_ES") {
            i++
            replacement = [makeIntConstantToken("1", token)]
          } else if (token.image === "__VERSION__") {
            i++
            replacement = [makeIntConstantToken("300", token)]
          }
          if (replacement) {
            const deleteCount = i - start
            tokens.splice(start, deleteCount, ...replacement)
            // Extend previous block ranges, so we don't replace the original
            // thing when it was called indirectly.
            for (const k of blockedReplacements) {
              if (blockedReplacementsOffset + i < k.end) {
                k.end += replacement.length - deleteCount
                // todo remove if past
              }
            }
            blockedReplacements.push({
              macroName: token.image,
              start: blockedReplacementsOffset + start,
              end: blockedReplacementsOffset + start + replacement.length,
            })
            i = start - 1
          }
        }
        if (!replacement) {
          result.push(token)
        }
      }
    }
  }

  recurse(true)

  if (errors.length) {
    throw errors[0].error
    throw new Error(errors.map((x) => x.message).join("\n"))
  }

  return result
}
