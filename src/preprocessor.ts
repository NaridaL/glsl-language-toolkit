import { IToken } from "chevrotain"
import { Token } from "./nodes"
import { lex, TOKEN } from "./lexer"

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
      const result = nonWhitespace + resultNewlines
      return result
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
  const map: Record<string, Token[]> = {}
  for (let i = 0; i < params.length; i++) {
    map[params[i]] = args[i] ?? []
  }
  const result: Token[] = []
  for (const t of tokens) {
    if (isPreprocIdentifier(t) && map[t.image]) {
      result.push(...map[t.image])
    } else {
      result.push(macroifyToken(t, macroInvocation))
    }
  }
  return result
}

function macroifyToken(
  t: Token,
  invocation: Token,
): Token & { macroSource: Token } {
  return Object.assign({}, t, { macroSource: t })
}

export function preproc(input: string): Token[] {
  const noLineCont = applyLineContinuations(input)
  const tokens = lex(noLineCont.result)
  fixLocations(tokens, noLineCont.changes)
  preprocMacros(tokens)
  return tokens
}

export function preprocMacros(tokens: Token[]): void {
  function markError(token: Token, s: string): void {}

  const definitions: Record<
    string,
    | { kind: "function"; params: string[]; tokens: Token[] }
    | { kind: "object"; tokens: Token[] }
  > = {}

  for (let i = 0; i < tokens.length; i++) {
    const parseMacroArgs = (): Token[][] => {
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
          return params
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

    const token = tokens[i]

    if (token.tokenType === TOKEN.PREPROC) {
      let lastTokenOnLine = i
      while (
        lastTokenOnLine + 1 < tokens.length &&
        (tokens[lastTokenOnLine].lineNoCont ??
          tokens[lastTokenOnLine].startLine) ===
          (tokens[lastTokenOnLine + 1].lineNoCont ??
            tokens[lastTokenOnLine + 1].startLine)
      ) {
        lastTokenOnLine++
      }
      if (token.image === "#define") {
        if (lastTokenOnLine === i) {
          // TODO: two arguments?
          markError(token, "#define needs at least one argument")
        } else {
          const name = tokens[i + 1]
          // function macro if no space between name and LEFT_PAREN
          const isFunctionMacro =
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
                  markError(tokens[j], "expected ',' or ')")
                  break
                }
                params.push(tokens[j].image)
                j++
              }
            }
            if (tokens[j].tokenType !== TOKEN.RIGHT_PAREN) {
              markError(tokens[j], "expected ',' or ')'")
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
      } else {
        markError(token, "unknown preprocessor directive " + token.image)
      }
      tokens.splice(i, lastTokenOnLine + 1 - i)
      i--
    } else if (isPreprocIdentifier(token)) {
      const definition = definitions[token.image]
      if (definition) {
        let replacement
        const start = i
        if (definition.kind === "object") {
          i++
          replacement = definition.tokens.map((t) => macroifyToken(t, token))
        } else {
          if (
            i + 1 < tokens.length &&
            tokens[i + 1].tokenType === TOKEN.LEFT_PAREN
          ) {
            i++
            const args = parseMacroArgs()
            replacement = performFunctionMacroInlining(definition, args, token)
          }
        }
        if (replacement) {
          tokens.splice(start, i - start, ...replacement)
          i-- // replaced tokens get recursively replaced if necessary
        }
      }
    }
  }
}
