import { readFileSync } from "fs"
import { last, Many } from "lodash"

import { check, evaluateConstantExpression } from "./checker"
import { parseInput } from "./parser"
import { ExpressionStatement, FunctionDefinition } from "./nodes"
import { cmap } from "./util"
import ProvidesCallback = jest.ProvidesCallback

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

function mat(...rs: number[][]): number[] {
  const cols = rs[0].length
  const rows = rs.length
  const result = Array(cols * rows)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      result[c * rows + r] = Math.fround(rs[r][c])
    }
  }
  return Object.assign(result, { rows })
}

type V = number | boolean | Record<string, unknown>
describe("/*constant expressions", () => {
  function c(expectedValue: Many<V>): ProvidesCallback {
    const cfround = (x: V): V =>
      typeof x === "number" && x % 1 !== 0 ? Math.fround(x) : x
    expectedValue = cmap(expectedValue, cfround)
    return () => {
      const exprStr = expect.getState().currentTestName
      const unit = parseInput(`void main() { ${exprStr}; }`)
      const errs = check(unit)
      if (errs.length) {
        if (errs[0].error) {
          console.log(errs[0].error)
        }
        throw new Error("" + errs.map((e) => e.err).join("\n"))
      }
      const expr = (
        last(
          (unit.declarations[0] as FunctionDefinition).body.statements,
        ) as ExpressionStatement
      ).expression
      const value = evaluateConstantExpression(expr)?.value
      delete value.cols
      expect(value).toEqual(expectedValue)
    }
  }

  const float = c,
    uint = c,
    int = c

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
    test("const struct S { float f; } s = S(2.0); s.f", c(2))
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

    test("mat2(2)", c(mat([2, 0], [0, 2])))
    test(
      "mat3x3(mat2x3(vec3(4), 5, 6, 7))",
      c(mat([4, 5, 0], [4, 6, 0], [4, 7, 1])),
    )
    test("mat2x3(1,2,3, 4,5,6)", c(mat([1, 4], [2, 5], [3, 6])))
  })

  describe("unary operations*/", () => {
    test("-12", c(-12))
    test("-1u", c(0xffff_ffff))
    test("-1.2", c(-1.2))

    test("-vec2(1)", c([-1, -1]))
    test("-ivec2(1)", c([-1, -1]))
    test("-uvec2(1)", c([0xffff_ffff, 0xffff_ffff]))

    test(
      "-mat4(.2)",
      c(
        mat(
          [-0.2, -0, -0, -0],
          [-0, -0.2, -0, -0],
          [-0, -0, -0.2, -0],
          [-0, -0, -0, -0.2],
        ),
      ),
    )

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
    test("float[](2., 3.)", c([2, 3]))
    test("float[2](2., 3.)", c([2, 3]))
  })

  describe("operations on scalars*/", () => {
    test("1+3", c(4))
    test("1.2+1.4", c(2.6))
    test("2u-3u", c(0xffff_ffff))
  })

  describe("array access*/", () => {
    test("vec3(1)[0]", c(1))
    test("mat3(2)[1]", c([0, 2, 0]))
    test("mat4x2(3)[2]", c([0, 0]))
    test("float[](2., 3.)[1]", c(3))
  })

  describe("method call*/", () => {
    test("float[2](3., 4.).length()", c(2))
    test("struct S { int i; } x; S[](x).length()", c(1))
  })

  describe("field access*/", () => {
    test("struct S { float f; }; S(2.0).f", c(2))
    test("vec3(1).x", c(1))
    test("vec4(1, 2, 3, 4).rrgb", c([1, 1, 2, 3]))
    test("vec4(1, 2, 3, 4).bb", c([3, 3]))
  })

  describe("builtin functions*/", () => {
    test("radians(30.)", float(Math.PI / 6))
    test("radians(vec2(60))", float([Math.PI / 3, Math.PI / 3]))
    test("degrees(2.)", float(360 / Math.PI))
    test("degrees(vec2(3))", float([540 / Math.PI, 540 / Math.PI]))
    test("sin(1.)", float(Math.sin(1)))
    test("cos(2.)", float(Math.cos(2)))
    test("tan(3.)", float(Math.tan(3)))
    // no point testing the rest of the Math functions the same way
    test("atan(1./-1.)", float(-2.35619449))
    test("atan(1., -1.)", float(-2.35619449))
    test("atan(vec2(1,-1),vec2(1,-1))", float([0.785398163, -2.35619449]))
    test("exp2(2.)", float(4))
    test("inversesqrt(vec2(1, 2))", float([1, Math.SQRT1_2]))
    test("roundEven(vec4(3.3, 3.5, 4.5, 4.8))", float([3, 4, 4, 5]))
    test("fract(500000.4)", float(0.4))
    test("mod(vec2(3.5, 5), 2.)", float([1.5, 1]))
    test("mod(5., 2.)", float(1))
    test("mod(vec2(3), vec2(2))", float([1, 1]))
    test("clamp(3.2, 2., 3.)", float(3))
    test("mix(.2, .3, .5)", float(0.25))
    test("min(.2, .3, .5)", float(0.25)) // TODO: should be error
    test("mix(3., 1./0., false)", float(3))
    test("step(.5, vec2(.4, .6))", float([0, 1]))
    test("smoothstep(.2, .3, .1)", float(0))
    test("smoothstep(.2, .3, vec2(.1, .25))", float([0, 0.5]))
    test("isnan(sqrt(-1.))", c(true))
    test("isinf(-1./0.)", c(true))
    test("floatBitsToInt(vec2(0, -3.25))", int([0, 0xc0500000]))
    test("floatBitsToUint(vec2(0, -3.25))", int([0, 0xc0500000]))
    test("intBitsToFloat(ivec2(0, 0xc0500000))", float([0, -3.25]))
    test("uintBitsToFloat(ivec2(0, 0xc0500000))", float([0, -3.25]))
    //fract
    // mod
    // clamp
    // mix
    // step
    // smoothstep
    test("length(vec2(3,4))", float(5))
    test("length(vec3(1,2,2))", float(3))
    test("distance(vec2(1),vec2(4,5))", float(5))
    test("dot(vec4(2),vec4(3))", float(24))
    test("cross(vec3(3,-3,1),vec3(4,9,2))", float([-15, -2, 39]))
    test("normalize(vec3(4,2,4))", float([2 / 3, 1 / 3, 2 / 3]))
    test("faceforward(vec2(3), vec2(-.2), vec2(1,0))", float([3, 3]))
    test("reflect(vec2(-.8, -.3), vec2(1,0))", float([0.8, -0.3]))
    test("refract(vec2(-.8, -.3), vec2(1,0), .8)", float([1, 1]))

    test("matrixCompMult(mat2(2,2,2,2), mat2(3))", c(mat([6, 0], [0, 6])))
    test("mat2(2,2,2,2)* mat2(3)", c(mat([3, 0], [0, 3])))

    test("transpose(mat2x3(1,2,3, 4,5,6))", c(mat([1, 2, 3], [4, 5, 6])))
    test(
      "outerProduct(vec3(1,2,3), vec2(4,5))",
      c(mat([4, 5], [8, 10], [12, 15])),
    )

    test("lessThan(vec3(2, 1, 0),vec3(1))", c([false, false, true]))
    test("lessThanEqual(vec3(2, 1, 0),vec3(1))", c([false, true, true]))
    test("greaterThan(vec3(2, 1, 0),vec3(1))", c([true, false, false]))
    test("greaterThanEqual(vec3(2, 1, 0),vec3(1))", c([true, true, false]))

    test("equal(vec2(1.), vec2(2.))", c([false, false]))
    test("notEqual(uvec3(3), uvec3(3))", c([false, false, false]))

    test("not(bvec3(0, 1, 1))", c([true, false, false]))
    test("all(bvec3(0, 1, 1))", c(false))
    test("any(bvec3(0, 1, 1))", c(true))

    test("dFdx(vec2(3.2))", float(0))
    test("dFdy(vec2(3.2))", float(0))
    test("fwidth(vec2(3.2))", float(0))
  })
})
