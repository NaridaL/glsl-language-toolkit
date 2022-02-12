import { tokenMatcher } from "chevrotain"
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

type int32 = number
const PREPROC_EVALUATOR = new (class extends AbstractVisitor<int32> {
  public eval(n: Node) {
    return super.visit(n)!
  }

  protected constantExpression(n: ConstantExpression): int32 {
    if (n._const.tokenType !== TOKEN.INTCONSTANT) {
      throw new Error("XX")
    }
    return +n._const.image
  }

  isDefined(macroName: string) {
    return false
  }

  protected unaryExpression(n: UnaryExpression): int32 {
    switch (n.op.tokenType) {
      case TOKEN.IDENTIFIER:
        // must be "defined"
        return +this.isDefined((n.on as VariableExpression).var.image)
      case TOKEN.DASH:
        return -this.visit(n.on)!
      case TOKEN.TILDE:
        return ~this.visit(n.on)!
      case TOKEN.BANG:
        return +!this.visit(n.on)!
      default:
        throw new Error()
    }
  }

  protected binaryExpression(n: BinaryExpression): int32 {
    const l = this.visit(n.lhs)
    const r = this.visit(n.rhs)
    return doOp(n.op.tokenType, l, r) | 0
  }

  protected variableExpression(_n: VariableExpression): int32 | undefined {
    // We have already preprocessed the ppConstantExpression at this point.
    // If there are any "variables" left, it means they were not defined. This
    // is not valid in GLSL ES 3.0, so we output an error.
    this.markError(_n.var, "Undefined identifier")
    return 0
  }

  private markError(_var: Token, undefinedIdentifier: string): void {
    // TODO
  }
})()

function isPreprocIdentifier(t: Token) {
  return (
    t.tokenType === TOKEN.IDENTIFIER ||
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
    while (tokens[tokensIdx].endOffset! < change.newOffset) {
      tokensIdx++
    }
    // fix location on all tokens inside this location
    while (tokens[tokensIdx].startOffset < change.newOffset + change.length) {
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
  | { kind: "function"; params: string[]; tokens: Token[] }
  | { kind: "object"; tokens: Token[] }
>
const BUILT_IN_MACROS = [
  "__LINE__",
  "__FILE__",
  "__VERSION__",
  "GL_ES",
] as ReadonlyArray<string>

export function preprocMacros(
  tokens: Token[],
  start = 0,
  definitions: MacroDefinitions = {},
  errors: CheckError[] = [],
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
    const preprocessedInput = preprocMacros(input, 0, definitions, errors)
    GLSL_PARSER.input = preprocessedInput
    const ast = GLSL_PARSER.ppConstantExpression()
    checkParsingErrors("", GLSL_PARSER.errors)
    const conditionValue = PREPROC_EVALUATOR.eval(ast)
    return [end, conditionValue]
  }

  function parseMacroArgs(
    tokens: Token[],
    start: number,
  ): [newI: number, args: Token[][]] {
    let i = start
    const params: Token[][] = []
    let currentParam: Token[] = []
    let depth = 0
    i++ // skip LEFT_PAREN
    while (i < tokens.length) {
      const t = tokens[i]
      if (depth === 0 && t.tokenType === TOKEN.COMMA) {
        params.push(currentParam)
        currentParam = []
      } else if (depth === 0 && t.tokenType === TOKEN.RIGHT_PAREN) {
        params.push(currentParam)
        i++
        return [i, params]
      } else {
        if (t.tokenType === TOKEN.LEFT_PAREN) {
          depth++
        } else if (t.tokenType === TOKEN.RIGHT_PAREN) {
          depth--
        }
        currentParam.push(t)
      }
      i++
    }
    throw new Error()
  }

  // After replacement of a macro, we want to avoid recursively replacing
  // the same macro infinitely. With these vars, we block the replacement.
  let blockToken = ""
  let blockUntil = 0

  let i = 0

  function recurse(outputting: boolean): void {
    for (; i < tokens.length; i++) {
      const token = tokens[i]

      if (tokenMatcher(token, TOKEN.PP)) {
        if (outputting && token.tokenType === TOKEN.PP_DEFINE) {
          const lastTokenOnLine = getLastTokenOnLine(i)
          if (lastTokenOnLine === i) {
            // TODO: two arguments?
            markError("P0001", token, "#define needs at least one argument")
          } else {
            const name = tokens[i + 1]
            if (name.image.startsWith("GL_")) {
              markError(
                "P0001",
                name,
                "macro name starting with GL_ is not allowed",
              )
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
                }
              } else {
                definitions[name.image] = {
                  kind: "object",
                  tokens: tokens.slice(i + 2, lastTokenOnLine + 1),
                }
              }
            }
            i = lastTokenOnLine
          }
        } else if (outputting && token.tokenType === TOKEN.PP_UNDEF) {
          const lastTokenOnLine = getLastTokenOnLine(i)
          if (lastTokenOnLine === i) {
            markError("P0001", token, "#undef needs exactly one parameter")
          } else {
            const name = tokens[i + 1]
            if (BUILT_IN_MACROS.includes(name.image)) {
              markError("P0001", name, "cannot undefine built-in macro")
            } else {
              delete definitions[name.image]
            }
            i = lastTokenOnLine
          }
        } else if (
          token.tokenType === TOKEN.PP_IF ||
          token.tokenType === TOKEN.PP_IFDEF ||
          token.tokenType === TOKEN.PP_IFNDEF
        ) {
          let keptLineBlock = false
          const lastTokenOnLine = getLastTokenOnLine(i)
          if (outputting) {
            if (token.tokenType === TOKEN.PP_IF) {
              const [newI, conditionValue] =
                parseAndEvalPPConstantExpressionOnLine(i)
              i = newI
              keptLineBlock = conditionValue !== 0
            } else {
              if (lastTokenOnLine !== i + 1) {
                markError(
                  "P0001",
                  token,
                  "#ifdef/#ifndef must have exactly one argument",
                )
              }
              const argToken = tokens[i + 1]
              keptLineBlock =
                !!definitions[argToken.image] ===
                (token.tokenType === TOKEN.PP_IFDEF)
            }
          }
          i = lastTokenOnLine + 1
          recurse(keptLineBlock)
          while (tokens[i].tokenType === TOKEN.PP_ELIF) {
            let keepElifLineBlock = false
            if (outputting && !keptLineBlock) {
              // eval elif condition
              const [newI, conditionValue] =
                parseAndEvalPPConstantExpressionOnLine(i)
              i = newI
              keepElifLineBlock = conditionValue !== 0
            }
            keptLineBlock ||= keepElifLineBlock
            recurse(keepElifLineBlock)
          }
          if (tokens[i].tokenType === TOKEN.PP_ELSE) {
            i++
            // todo: expect no tokens until end of line
            recurse(outputting && !keptLineBlock)
          }
          if (tokens[i].tokenType !== TOKEN.PP_ENDIF) {
            markError(
              "P0001",
              tokens[i],
              `Unexpected TOKEN ${tokens[i].image}, expected #endif`,
            )
          }
        } else if (
          token.tokenType === TOKEN.PP_ENDIF ||
          token.tokenType === TOKEN.PP_ELIF ||
          token.tokenType === TOKEN.PP_ELSE
        ) {
          return
        } else if (token.tokenType === TOKEN.PP_INVALID) {
          markError(
            "P0001",
            token,
            "unknown preprocessor directive " + token.image,
          )
        } else {
          throw new Error(token.image)
        }
      } else if (outputting) {
        const token = tokens[i]
        let didReplacement = false
        if (
          isPreprocIdentifier(token) &&
          !(i < blockUntil && token.image === blockToken)
        ) {
          const definition = definitions[token.image]
          if (definition) {
            let replacement
            const start = i
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
                let args
                ;[i, args] = parseMacroArgs(tokens, i)
                args = args.map((argTokens) =>
                  preprocMacros(argTokens, 0, definitions, errors),
                )
                replacement = performFunctionMacroInlining(
                  definition,
                  args,
                  token,
                )
              }
            }
            if (replacement) {
              const deleteCount = i - start
              tokens.splice(start, deleteCount, ...replacement)
              didReplacement = true
              if (i >= blockUntil) {
                // we are outside the previous replacement
                blockToken = token.image
                blockUntil = start + replacement.length
              } else {
                // extends previous block range so we don't replace the original thing when it was called indirectly
                blockUntil += replacement.length - deleteCount
              }
              i = start - 1
            }
          }
        }
        if (!didReplacement) {
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
