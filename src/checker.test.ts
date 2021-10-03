import { readFileSync } from "fs"
import { check, evaluateConstantExpression } from "./checker"
import { parseInput } from "./parser"
import ProvidesCallback = jest.ProvidesCallback
import {
  ExpressionStatement,
  FunctionDefinition,
  TranslationUnit,
} from "./nodes"
import { last } from "lodash"

function bla(p: string) {
  const parsed = parseInput(p)
  return check(parsed)
}

function ttt(p: string, ...expectedErrors: string[]) {
  p = p.replace(/'/g, "")
  p = p.replace(/\[\[/g, "")
  p = p.replace(/]]/g, "")
  console.log("testing", p)
  const errs = bla(p)
  expect(errs.map((x) => x.err)).toEqual(expectedErrors)
  return errs
}
test("checks shader.glsl", () => {
  const c = readFileSync(__dirname + "/../fixtures/shader.glsl", {
    encoding: "utf8",
  })
  ttt(c)
})
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
test("S0004: binary operator not supported for operand types", () => {
  ttt("void main() { 1 + 1.; }", "S0004")
  ttt("void main() { 1. + float[2](1., 2.); }", "S0004")
})
test("S0004: unary operator not supported for operand types", () => {
  ttt("void main() { float[2] a; -a; }", "S0004")
})
test("S0022: redefinition of variable in same scope", () => {
  ttt("void main() { int a; float [[a]]; }", "S0022")
})
test("S0024: redefinition of variable in same scope", () => {
  ttt("struct a { int i; }; void a() {}", "S0024")
})
test("S0025: cannot mix .xyzw and .rgba", () => {
  ttt("void main() { vec3 a; a.xr; }", "S0025")
})
test("S0026: can swizzle at most 4 fields", () => {
  ttt("void main() { vec3 a; a.xxyyzz; }", "S0026")
})
test("S0027: TODO", () => {
  ttt("void main() { 1++; }", "S0027")
})

function uint(value: number): number {
  const buf = new ArrayBuffer(4)
  new Int32Array(buf)[0] = value
  return new Uint32Array(buf)[0]
}

function mat(
  dim: number | [number, number],
  ...diagOrRows: [number] | number[][]
): number[] {
  if (typeof dim === "number") {
    dim = [dim, dim]
  }
  const [cols, rows] = dim
  const result = Array(cols * rows)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      result[c * rows + r] = Math.fround(
        typeof diagOrRows[0] === "number"
          ? +(c === r) * diagOrRows[0]
          : (diagOrRows as number[][])[r][c],
      )
    }
  }
  return Object.assign(result, { rows })
}

describe("/*constant expressions", () => {
  function c(
    expectedValue:
      | number
      | boolean
      | number[]
      | boolean[]
      | Record<string, unknown>,
  ): ProvidesCallback {
    if (typeof expectedValue === "number" && expectedValue % 1 !== 0) {
      expectedValue = Math.fround(expectedValue)
    }
    return () => {
      const exprStr = expect.getState().currentTestName
      const unit = parseInput(`void main() { ${exprStr}; }`) as TranslationUnit
      const errs = check(unit)
      if (errs.length) {
        throw new Error("" + errs.map((e) => e.err).join("\n"))
      }
      const expr = (
        last(
          (unit.declarations[0] as FunctionDefinition).body.statements,
        ) as ExpressionStatement
      ).expression
      const value = evaluateConstantExpression(expr)?.value
      expect(value).toEqual(expectedValue)
    }
  }

  describe("constants*/", () => {
    test("1", c(1))
    test("010", c(8))
    test("0xff", c(255))

    test("1u", c(1))
    test("010u", c(8))
    test("0xffu", c(255))

    test("1.", c(1))
    test("1e2", c(100))

    test("true", c(true))
    test("false", c(false))
  })

  describe("constant variables*/", () => {
    test("const int i = 1; i", c(1))
  })

  describe("constructors*/", () => {
    test("float(true)", c(1))
    test("float(0xffffffffu)", c(Math.fround(0xffff_ffff)))
    test("int(1.2)", c(1))
    test("uint(-0)", c(0))
    test("uint(-1)", c(0xffff_ffff))
    test("uint(-2)", c(0xffff_fffe))

    test("vec2(1., 2.)", c([1, 2]))
    test("vec4(1., 2, 3u, false)", c([1, 2, 3, 0]))
    test("vec4(vec2(1), bvec2(0))", c([1, 1, 0, 0]))
    test("bvec4(2.)", c([true, true, true, true]))

    test("mat2(2)", c(mat(2, 2)))
    test(
      "mat3x3(mat2x3(vec3(4), 5, 6, 7))",
      c(mat(3, [4, 5, 0], [4, 6, 0], [4, 7, 1])),
    )
  })

  describe("unary operations*/", () => {
    test("-12", c(-12))
    test("-1u", c(0xffff_ffff))
    test("-1.2", c(-1.2))

    test("-vec2(1)", c([-1, -1]))
    test("-ivec2(1)", c([-1, -1]))
    test("-uvec2(1)", c([0xffff_ffff, 0xffff_ffff]))

    test("-mat4(.2)", c(mat(4, -0.2)))

    test("~2", c(-3))
    test("~2u", c(0xffff_fffd))
    test("~ivec2(1)", c([-2, -2]))
    test("~uvec2(1, 2)", c([0xffff_fffe, 0xffff_fffd]))

    test("!true", c(false))
    test("!false", c(true))
  })

  describe("structs constructors*/", () => {
    test("struct S { float f; }; S(2.0)", c({ f: 2 }))
    test("struct S { float f; int i; }; S(2.0, 1)", c({ f: 2, i: 1 }))
  })

  describe("array constructors*/", () => {
    test("float[](2, 3)", c([2, 3]))
    test("float[2](2, 3)", c([2, 3]))
  })

  describe("operations on scalars*/", () => {
    test("1+3", c(4))
    test("1.2+1.4", c(2.6))
  })

  describe("array access*/", () => {
    test("vec3(1)[0]", c(1))
    test("mat3(2)[1]", c([0, 2, 0]))
    test("mat4x2(3)[2]", c([0, 0]))
    test("float[](2, 3)[1]", c(3))
  })

  describe("method call*/", () => {
    test("float[2](3, 4).length()", c(2))
    test("S[](x).length()", c(1))
  })

  describe("field access*/", () => {
    test("struct S { float f; }; S(2.0).f", c(2))
    test("vec3(1).x", c(1))
    test("vec4(1, 2, 3, 4).rrgb", c([1, 1, 2, 3]))
    test("vec4(1, 2, 3, 4).bb", c([3, 3]))
  })

  describe("builtin functions*/", () => {
    test("not(bvec3(0, 1, 1))", c([true, false, false]))
    test("all(bvec3(0, 1, 1))", c(false))
    test("any(bvec3(0, 1, 1))", c(true))
  })
})
