import { Token } from "./nodes"
import { TOKEN } from "./lexer"

function isPreprocessorIdentifier(t: Token) {
  return (
    t.tokenType === TOKEN.IDENTIFIER ||
    t.tokenType.CATEGORIES?.includes(TOKEN.KEYWORD) ||
    t.tokenType.CATEGORIES?.includes(TOKEN.BASIC_TYPE)
  )
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

export function preproc(input: string, tokens: Token[]) {
  function markError(token: Token, s: string): void {
  }

  const definitions = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    function nextTokenOnSameLine() {
      if (
        i + 1 < tokens.length &&
        onSameLine(input, token.endOffset, tokens[i + 1].startOffset)
      ) {
      }
    }

    if (token.tokenType === TOKEN.PREPROC) {
      const nextNewLineIndex = findNextNewline(
        input,
        token.startOffset,
        input.length,
      )
      let lastTokenOnLine = i
      while (
        lastTokenOnLine + 1 < tokens.length &&
        tokens[lastTokenOnLine + 1].startOffset < nextNewLineIndex
        ) {
        lastTokenOnLine++
      }
      if (token.image === "#define") {
        if (lastTokenOnLine === i) {
          // TODO: two arguments?
          markError(token, "#define needs at least one argument")
        } else {
          const name = tokens[i + 1]
          const isFunctionMacro =
            tokens[i + 2].tokenType === TOKEN.LEFT_PAREN &&
            tokens[i].endOffset === tokens[i + 1].startOffset
          if (isFunctionMacro) {
            let params = []
            let j = i + 3
            if (isPreprocessorIdentifier(tokens[j])) {
              params.push(tokens[j].image)
              j++
              while (tokens[j].tokenType === TOKEN.COMMA) {
                j++
                if (!isPreprocessorIdentifier(tokens[j])) {
                  markError(tokens[j], "expected COMMA or ")
                  break
                }
              }
            }
            if (tokens[j] !== TOKEN.RIGHT_PAREN) {
              markError(tokens[j])
            }
          }
        }
        definitions.push({
          kind: isFunctionMacro ? "function" : "object", name: name.image,
          tokens: x,
        })
      }
    } else {
      markError(token, "unknown preprocessor directive " + token.image)
    }
  }
}
}
