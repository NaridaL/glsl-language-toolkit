import { Many } from "lodash"
import { isToken, Node, Token } from "./nodes"

export const DEV = process.env.NODE_ENV !== "production"

export function invariant(x: unknown, message = ""): void {
  if (DEV && !x) {
    throw new Error(message)
  }
}

export function underline(str: string, start: number, end: number): string {
  return str + "\n" + "-".repeat(start) + "^".repeat(end - start)
}

/**
 * If array, call .map, otherwise just call f on the one object.
 */
export function safeMap<T, R>(
  x: Many<T>,
  f: (x: T, i: number, arr: Many<T>) => R,
): Many<R> {
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length; i++) {
      x[i] = f(x[i], i, x)
    }
    return x
  } else {
    return f(x as T, 0, x)
  }
}

export interface ExpandedLocation {
  startLine: number
  endLine: number
  startColumn: number
  endColumn: number
}

export function mapExpandedLocation(n: Token | Node): ExpandedLocation {
  if (isToken(n)) {
    return n as ExpandedLocation
  } else {
    if (!n.firstToken) {
      throw new Error(n.kind)
    }
    return {
      startLine: n.firstToken.startLine!,
      startColumn: n.firstToken.startColumn!,
      endLine: n.lastToken!.endLine!,
      endColumn: n.lastToken!.endColumn!,
    }
  }
}

export interface CheckError {
  where: Token | Node
  loc: ExpandedLocation
  code: string
  message: string
  error: Error
}

export function substrContext(input: string, token: ExpandedLocation): string {
  const lines = input.split("\n")
  const sLine = token.startLine
  const eLine = token.endLine
  return (
    "./src/compiler.lambda:" +
    sLine +
    ":" +
    (token.startColumn - 1) +
    "\n" +
    lines
      .map((l, i) => [i + 1, l] as [number, string])
      .slice(sLine - 2, eLine + 2)
      .map(([n, l]) => {
        if (n >= sLine && n <= eLine) {
          l = underline(
            l,
            6 + (sLine === n ? token.startColumn - 1 : 0),
            6 + (eLine === n ? token.endColumn : l.length),
          )
        }

        return ("" + n).padStart(5) + " " + l
      })
      .join("\n")
  )
  // start -= 20
  // if (start < 0) {
  //   start = 0
  // } else {
  //   start = input.lastIndexOf("\n", start) + 1
  // }
  // end += 20
  // if (end > input.length) {
  //   end = input.length
  // } else {
  //   end = input.indexOf("\n", end)
  // }
  // return input.substr(start, end)
}

export function allDefined<T>(ts: (T | undefined)[]): ts is T[] {
  return ts.every(Boolean)
}

// @ts-expect-error this function should be removed as dead code when !DEV
export function assertNever(_x?: never): never {
  if (!DEV) {
    throw new Error()
  }
}

export function offsetToLineCol(
  input: string,
  offset: number,
): [line: number, col: number] {
  if (offset > input.length) {
    throw new Error("offset cannot be larger than input.length")
  }
  let i = 0
  let line = 1
  let lineStart = 0
  while (i < offset) {
    if (input[i] === "\n") {
      line++
      lineStart = i + 1
    }
    i++
  }
  return [line, offset - lineStart + 1]
}

export function lineColToOffset(
  input: string,
  line: number,
  col: number,
): number {
  let i = 0
  let iLine = 1
  while (iLine < line) {
    if (input[i] === "\n") {
      iLine++
    }
    i++
  }
  return i + col - 1
}

export function ilog<T>(x: T): T {
  console.log(x)
  return x
}
