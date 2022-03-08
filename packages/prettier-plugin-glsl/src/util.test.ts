import expect from "expect"
import { dedent } from "./testutil"
import { lineColToOffset, offsetToLineCol } from "./util"

describe("lineColToOffset", () => {
  const input = dedent`
    void main() {
      float f = 32 * a;
    }
  `
  test("1:1", () => expect(lineColToOffset(input, 1, 1)).toEqual(0))
  test("1:14", () => expect(lineColToOffset(input, 1, 14)).toEqual(13))
  test("2:1", () => expect(lineColToOffset(input, 2, 1)).toEqual(14))
  test("2:12", () => expect(lineColToOffset(input, 2, 12)).toEqual(25))
})

describe("offsetToLineCol", () => {
  const input = dedent`
    void main() {
      float f = 32 * a;
    }
  `
  test("0", () => expect(offsetToLineCol(input, 0)).toEqual([1, 1]))
  test("3", () => expect(offsetToLineCol(input, 3)).toEqual([1, 4]))
  test("13", () => expect(offsetToLineCol(input, 13)).toEqual([1, 14]))
  test("14", () => expect(offsetToLineCol(input, 14)).toEqual([2, 1]))
  test("15", () => expect(offsetToLineCol(input, 15)).toEqual([2, 2]))
})
