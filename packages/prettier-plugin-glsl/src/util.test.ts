import expect from "expect"
import { dedent, lineColToOffset } from "./util"

describe("lineColToOffset", () => {
  const input = dedent`
    void main() {
      float f = 32 * a;
    }
  `
  test("it works", () => {
    expect.equal(lineColToOffset(input, 1, 1))
  })
})