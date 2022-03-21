/**
 * @copyright
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Desmond Brand (dmnd@desmondbrand.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export function dedent(
  strings: string | TemplateStringsArray,
  ...args: string[]
): string {
  const raw = typeof strings === "string" ? [strings] : strings.raw

  // first, perform interpolation
  let result = ""
  for (let i = 0; i < raw.length; i++) {
    result += raw[i]

    if (i < (args.length <= 1 ? 0 : args.length - 1)) {
      result += args.length <= i + 1 ? undefined : args[i + 1]
    }
  }

  // now strip indentation
  const lines = result.split("\n")
  let mindent = Number.MAX_SAFE_INTEGER
  lines.forEach(function (l) {
    const m = l.match(/^(\s+)\S+/)
    if (m) {
      const indent = m[1].length
      mindent = Math.min(mindent, indent)
    }
  })

  if (mindent !== Number.MAX_SAFE_INTEGER) {
    result = lines.map((l) => (l[0] === " " ? l.slice(mindent) : l)).join("\n")
  }

  return (
    result
      // dedent eats leading and trailing whitespace too
      .trim()
      // handle escaped newlines at the end to ensure they don't get stripped too
      .replace(/\\n/g, "\n")
  )
}
