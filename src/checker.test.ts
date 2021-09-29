import { parseInput } from "./index"
import { check } from "./checker"

function bla(p: string) {
  const parsed = parseInput(p)
  return check(parsed)
}

function ttt(p: string, ...expectedErrors: string[]) {
  p = p.replace(/'/g, "")
  const errs = bla(p)
  expect(errs.map((x) => x.err)).toEqual(expectedErrors)
}
test("S0001: type mismatch", () => {
  ttt("void main() { 1 '+' 1.0; }", "S0001")
})
test("S0003: if has bool as condition", () => {
  ttt("void main() { if ('1'); }", "S0003")
})
test("S0003: while has bool as condition", () => {
  ttt("void main() { while ('1.'); }", "S0003")
})
test("S0003: do-while has bool as condition", () => {
  ttt("void main() { do {} while ('vec3(1.)'); }", "S0003")
})
test("S0003: for has bool as condition", () => {
  ttt("void main() { for (; 1u; ); }", "S0003")
})
