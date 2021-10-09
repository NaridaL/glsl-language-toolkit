import { Many } from "lodash"
import "colors"

export const DEV = process.env.NODE_ENV !== "production"

export function invariant(x: unknown): void {
  if (DEV && !x) {
    throw new Error()
  }
}

export function underline(
  str: string,
  start: number,
  end: number,
  ff = (x: string) => x.yellow.underline,
  ff2 = (x: string) => x,
): string {
  return (
    ff2(str.substring(0, start)) +
    ff(str.substring(start, end)) +
    ff2(str.substring(end))
  )
}

export function ccorrect<T, R>(
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
            sLine === n ? token.startColumn - 1 : 0,
            eLine === n ? token.endColumn : l.length,
            (s) => s.red.underline,
          )
        }

        return ("" + n).padStart(5).green + " " + l
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
