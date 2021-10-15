import { readFileSync } from "fs"
import { VError } from "@netflix/nerror"
import { last, Many } from "lodash"

import { check, evaluateConstantExpression, ShaderType } from "./checker"
import { parseInput } from "./parser"
import { ExpressionStatement, FunctionDefinition } from "./nodes"
import { ccorrect, substrContext } from "./util"
import ProvidesCallback = jest.ProvidesCallback

function parseAndCheck(p: string, shaderType: ShaderType | undefined) {
  const parsed = parseInput(p)
  return check(parsed, shaderType)
}

function glsl(
  p: string,
  expectedErrorCodes: string[],
  shaderType?: ShaderType,
) {
  const expectedErrors = expectedErrorCodes.map((code) => ({
    code,
    start: 0,
    end: 0,
  }))
  let i = 0
  p = p.replace(
    /`(.*?)`|\[\[(.*?)]]|'(.*?)'/g,
    (
      _,
      m0: string | undefined,
      m1: string | undefined,
      m2: string | undefined,
      offset,
    ) => {
      const str = (m0 ?? m1 ?? m2)!
      console.log(m0, m1, m2, offset)
      expectedErrors[i].start = offset + 1
      expectedErrors[i].end = offset + str.length
      i++
      return str
    },
  )
  const errs = parseAndCheck(p, shaderType)
  try {
    expect(
      errs.map(({ code, loc }) => ({
        code,
        start: loc.startColumn,
        end: loc.endColumn,
      })),
    ).toEqual(expectedErrors)
  } catch (e) {
    const message = errs
      .map((e) => "CHECK ERROR: " + e.message + "\n" + substrContext(p, e.loc))
      .join("\n")
    throw new VError({ cause: e as Error }, message)
  }
}

function glslExpr(expr: string, expectedErrors: string[]): void {
  glsl(`void main() { ${expr}; }`, expectedErrors)
}

test.skip("checks shader.glsl", () => {
  const c = readFileSync(__dirname + "/../fixtures/shader.glsl", {
    encoding: "utf8",
  })
  glsl(c, [])
})
describe("expected errors", () => {
  test.skip("S0001: type mismatch", () => glslExpr("1 '+' 1.0", ["S0001"]))
  test("S0003: if has bool as condition", () => glslExpr("if ('1')", ["S0003"]))
  test("S0003: while has bool as condition", () =>
    glslExpr("while ('1.')", ["S0003"]))
  test("S0003: do-while has bool as condition", () =>
    glslExpr("do {} while ('vec3(1.)')", ["S0003"]))
  test("S0003: for has bool as condition", () =>
    glslExpr("for (; `1u`; )", ["S0003"]))
  test("S0031: const has no init", () => glsl("const int `x`;", ["S0031"]))
  test("S0004: binary operator not supported for operand types", () => {
    glslExpr("1 + 1.", ["S0004"])
    glslExpr("1. + float[2](1., 2.)", ["S0004"])
  })
  test("S0004: cannot assign float to int var", () =>
    glslExpr("int a; a = 1.0", ["S0004"]))
  test("S", () => glslExpr("float[2] r; r[`true`]", ["X"]))
  test("S0004: unary operator not supported for operand types", () =>
    glslExpr("float[2] a; `-a`", ["S0004"]))
  test("S0022: redefinition of variable in same scope", () =>
    glslExpr("int a; float [[a]]", ["S0022"]))
  test("S0022: redefinition of parameter", () =>
    glsl("void f(int i, `float i`);", ["S0022"]))
  test("S0024: redefinition of variable in same scope", () =>
    glsl("struct a { int i; }; void `a`() {}", ["S0024"]))
  test("C0001: struct specifier cannot be parameter type", () =>
    glsl("void f(`struct G {}` x);", ["C0001"]))
  test("S0025: cannot mix .xyzw and .rgba", () =>
    glslExpr("vec3 a; a.`xr`", ["S0025"]))
  test("S0026: can swizzle at most 4 fields", () =>
    glslExpr("vec3 a; a.`xxyyzz`", ["S0026"]))
  test("S0027: ternary cannot be l-value", () =>
    glslExpr("int a, b; `true ? a : b` = 2", ["S0027"]))
  test("S0027: TODO", () => glslExpr("`1`++", ["S0027"]))
  test("S0054: redefining builtin", () =>
    glsl("void `min`(int i) {}", ["S0054"]))
  test("S0057", () => glslExpr("switch (`true`) {}", ["S0057"]))
  test("S0027: const parameter cannot be l-value", () =>
    glsl("void f(const int i) { `i` = 2; }", ["S0027"]))
  test("S0035: All uses of invariant must be at the global scope", () => {
    // glslExpr("`invariant` a", ["S0035"])
    glslExpr("invariant float f", ["S0035"])
  })
  test("centroid out in fragment shader is an error", () =>
    glsl(
      "`centroid out` float f;",
      ["centroid out is not allowed in fragment shaders"],
      "fragment",
    ))
  test("invalid fragment shader outputs", () => {
    glsl(
      "out `bool` b;",
      ["boolean types are not allowed as fragment shader outputs"],
      "fragment",
    )
    glsl(
      "out `sampler2D` s;",
      ["opaque types are not allowed as fragment shader outputs"],
      "fragment",
    )
    glsl(
      "out `mat3` m;",
      ["matrix types are not allowed as fragment shader outputs"],
      "fragment",
    )
    glsl(
      "out `struct S { int i; }` g;",
      ["struct definitions are not allowed as fragment shader outputs"],
      "fragment",
    )
  })
  test("fragment shader outputs declared as array may only be indexed by a constant", () => {
    glsl(
      "uniform int i; out float[2] fs; void main() { fs[i]; }",
      [
        "fragment shader outputs declared as array may only be indexed by a constant",
      ],
      "fragment",
    )
  })
  describe("uniform block", () => {
    test("opaque types are not allowed ", () =>
      glsl("uniform U { `sampler2D` s; };", [
        "opaque type is not allowed in uniform block",
      ]))
    test("structure definition cannot be nested", () =>
      glsl("uniform U { `struct S { int i; }` s; };", [
        "struct definition is not allowed in uniform block",
      ]))
    test("no in qualifier on member", () =>
      glsl("uniform U { `in` int i; };", [
        "only the (redundant) qualifier uniform is allowed in a uniform block",
      ]))
  })

  test("S0034: Variable cannot be declared invariant", () =>
    glsl("`invariant` in float f;", ["S0034"]))

  test("too many args to builtin", () =>
    glslExpr("`min(.2, .3, .5)`", ["no matching overload for params"]))
  test("struct definition cannot be constructor", () =>
    glslExpr("`struct G { int i; }`(2)", [
      "structure definition cannot be constructor",
    ]))

  test("struct decl in func return type", () =>
    glsl("`struct G { int i; }` foo() { return G(1); }", ["yy"]))
})

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
  function is(expectedValue: Many<V>): ProvidesCallback {
    const cfround = (x: V): V =>
      typeof x === "number" && x % 1 !== 0 ? Math.fround(x) : x
    const rows = expectedValue.rows
    expectedValue = ccorrect(expectedValue, cfround)
    if (rows) {
      expectedValue.rows = rows
    }
    return () => {
      const exprStr = expect.getState().currentTestName
      const unit = parseInput(`void main() { ${exprStr}; }`)
      const errs = check(unit, undefined)
      if (errs.length) {
        if (errs[0].error) {
          console.log(errs[0].error)
        }
        throw new Error("" + errs.map((e) => e.message).join("\n"))
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

  const isFloat = is,
    isUint = is,
    isInt = is,
    isMat = (...rowArrays: number[][]) => is(mat(...rowArrays)),
    isBool = is

  describe("constants*/", () => {
    test("1", isInt(1))
    test("010", isInt(8))
    test("0xff", isInt(255))

    test("1u", isUint(1))
    test("010u", isUint(8))
    test("0xffu", isUint(255))

    test("1.", isFloat(1))
    test("1e2", isFloat(100))

    test("true", isBool(true))
    test("false", isBool(false))
  })

  describe("constant variables*/", () => {
    test("const int i = 1; i", isInt(1))
    test("const struct S { float f; } s = S(2.0); s.f", isFloat(2))
  })

  describe("constructors*/", () => {
    test("float(true)", isFloat(1))
    test("float(0xffffffffu)", isFloat(Math.fround(0xffff_ffff)))
    test("int(1.2)", isInt(1))
    test("uint(-0)", isUint(0))
    test("uint(-1)", isUint(0xffff_ffff))
    test("uint(-2)", isUint(0xffff_fffe))

    test("vec2(1., 2.)", is([1, 2]))
    test("vec4(1., 2, 3u, false)", isFloat([1, 2, 3, 0]))
    test("vec4(vec2(1), bvec2(0))", is([1, 1, 0, 0]))
    test("bvec4(2.)", is([true, true, true, true]))

    test("mat2(2)", isMat([2, 0], [0, 2]))
    test(
      "mat3x3(mat2x3(vec3(4), 5, 6, 7))",
      isMat([4, 5, 0], [4, 6, 0], [4, 7, 1]),
    )
    test("mat2x3(1,2,3, 4,5,6)", isMat([1, 4], [2, 5], [3, 6]))
  })

  describe("unary operations*/", () => {
    test("-12", isInt(-12))
    test("-1u", isUint(0xffff_ffff))
    test("-1.2", isFloat(-1.2))

    test("-vec2(1)", is([-1, -1]))
    test("-ivec2(1)", is([-1, -1]))
    test("-uvec2(1)", is([0xffff_ffff, 0xffff_ffff]))

    test(
      "-mat4(.2)",
      is(
        mat(
          [-0.2, -0, -0, -0],
          [-0, -0.2, -0, -0],
          [-0, -0, -0.2, -0],
          [-0, -0, -0, -0.2],
        ),
      ),
    )

    test("~2", isInt(-3))
    test("~2u", isUint(0xffff_fffd))
    test("~ivec2(1)", isInt([-2, -2]))
    test("~uvec2(1, 2)", isUint([0xffff_fffe, 0xffff_fffd]))

    test("!true", is(false))
    test("!false", is(true))
  })

  describe("structs constructors*/", () => {
    test("struct S { float f; }; S(2.0)", is({ f: 2 }))
    test("struct S { float f; int i; }; S(2.0, 1)", is({ f: 2, i: 1 }))
  })

  describe("array constructors*/", () => {
    test("float[](2., 3.)", is([2, 3]))
    test("float[2](2., 3.)", is([2, 3]))
  })

  describe("binary operations*/", () => {
    test("1+3", isInt(4))
    test("1.2+1.4", isFloat(2.6))
    test("2u-3u", isUint(0xffff_ffff))

    test("vec2(1,2) + 1.", isFloat([2, 3]))
    test("ivec2(1,2) + 1", isInt([2, 3]))
    test("uvec2(1,2) + 1u", isUint([2, 3]))
    test("1. + vec2(1,2)", isFloat([2, 3]))
    test("1 + ivec2(1,2)", isInt([2, 3]))
    test("1u + uvec2(1,2)", isUint([2, 3]))

    test("vec3(1,2,3) - vec3(4,5,6)", isFloat([-3, -3, -3]))
    test("vec3(1,2,3) * vec3(4,5,6)", isFloat([4, 10, 18]))

    test("mat2(1,2, 3,4) + 1.", isMat([2, 4], [3, 5]))
    test("mat2(1,2, 3,4) - 1.", isMat([0, 2], [1, 3]))
    test("mat2(1,2, 3,4) * 2.", isMat([2, 6], [4, 8]))
    test("mat2(1,2, 3,4) / .5", isMat([2, 6], [4, 8]))
    test("1. + mat2(1,2, 3,4)", isMat([2, 4], [3, 5]))
    test("1. - mat2(1,2, 3,4)", isMat([0, -2], [-1, -3]))
    test("12. / mat2(1,2, 3,4)", isMat([12, 4], [6, 3]))
    test("mat2(2,2,2,2) * mat2(3)", isMat([6, 6], [6, 6]))
    test("vec3(1,2,3) * mat2x3(7,9,11, 8,10,12)", isFloat([58, 64]))
    test("mat3x2(7,9, 11,8, 10,12) * vec3(1,2,3)", isFloat([59, 61]))
    test("mat2(1,2, 3,4) / mat2(1,2, 3,4)", isMat([1, 1], [1, 1]))
  })

  describe("array access*/", () => {
    test("vec3(1)[0]", isFloat(1))
    test("mat3(2)[1]", isFloat([0, 2, 0]))
    test("mat4x2(3)[2]", isFloat([0, 0]))
    test("float[](2., 3.)[1]", isFloat(3))
  })

  describe("method call*/", () => {
    test("float[2](3., 4.).length()", isInt(2))
    test("struct S { int i; } x; S[](x).length()", isInt(1))
  })

  describe("field access*/", () => {
    test("struct S { float f; }; S(2.0).f", isFloat(2))
    test("vec3(1).x", isFloat(1))
    test("vec4(1, 2, 3, 4).rrgb", isFloat([1, 1, 2, 3]))
    test("vec4(1, 2, 3, 4).bb", isFloat([3, 3]))
  })

  describe("builtin functions*/", () => {
    test("radians(30.)", isFloat(Math.PI / 6))
    test("radians(vec2(60))", isFloat([Math.PI / 3, Math.PI / 3]))
    test("degrees(2.)", isFloat(360 / Math.PI))
    test("degrees(vec2(3))", isFloat([540 / Math.PI, 540 / Math.PI]))
    test("sin(1.)", isFloat(Math.sin(1)))
    test("cos(2.)", isFloat(Math.cos(2)))
    test("tan(3.)", isFloat(Math.tan(3)))
    // no point testing the rest of the Math functions the same way
    test("atan(1./-1.)", isFloat(-0.78539818))
    test("atan(1., -1.)", isFloat(2.35619449))
    test("atan(vec2(1,-1),vec2(1,-1))", isFloat([0.785398163, -2.35619449]))
    test("exp2(2.)", isFloat(4))
    test("inversesqrt(vec2(1, 2))", isFloat([1, Math.SQRT1_2]))
    test("roundEven(vec4(3.3, 3.5, 4.5, 4.8))", isFloat([3, 4, 4, 5]))
    test("fract(500000.4)", isFloat(0.4))
    test("mod(vec2(3.5, 5), 2.)", isFloat([1.5, 1]))
    test("mod(5., 2.)", isFloat(1))
    test("mod(vec2(3), vec2(2))", isFloat([1, 1]))
    test("clamp(3.2, 2., 3.)", isFloat(3))
    test("mix(.2, .3, .5)", isFloat(0.25))
    test("mix(3., 1./0., false)", isFloat(3))
    test("step(.5, vec2(.4, .6))", isFloat([0, 1]))
    test("smoothstep(.2, .3, .1)", isFloat(0))
    test("smoothstep(.2, .3, vec2(.1, .25))", isFloat([0, 0.5]))
    test("isnan(sqrt(-1.))", is(true))
    test("isinf(-1./0.)", is(true))
    test("floatBitsToInt(vec2(0, -3.25))", isInt([0, -0x3fb00000]))
    test("floatBitsToUint(vec2(0, -3.25))", isUint([0, 0xc0500000]))
    test("intBitsToFloat(ivec2(0, 0xc0500000))", isFloat([0, -3.25]))
    test("uintBitsToFloat(uvec2(0, 0xc0500000))", isFloat([0, -3.25]))
    //fract
    // mod
    // clamp
    // mix
    // step
    // smoothstep
    test("length(vec2(3,4))", isFloat(5))
    test("length(vec3(1,2,2))", isFloat(3))
    test("distance(vec2(1),vec2(4,5))", isFloat(5))
    test("dot(vec4(2),vec4(3))", isFloat(24))
    test("cross(vec3(3,-3,1),vec3(4,9,2))", isFloat([-15, -2, 39]))
    test("normalize(vec3(4,2,4))", isFloat([2 / 3, 1 / 3, 2 / 3]))
    test("faceforward(vec2(3), vec2(-.2), vec2(1,0))", isFloat([3, 3]))
    test("reflect(vec2(-.8, -.3), vec2(1,0))", isFloat([0.8, -0.3]))
    test(
      "refract(vec2(.707107, -.707107), vec2(0,1), .9)",
      isFloat([0.6363963, -0.7713626]),
    )

    test("matrixCompMult(mat2(2,2,2,2), mat2(3))", isMat([6, 0], [0, 6]))

    test("transpose(mat2x3(1,2,3, 4,5,6))", isMat([1, 2, 3], [4, 5, 6]))
    test(
      "outerProduct(vec3(1,2,3), vec2(4,5))",
      isMat([4, 5], [8, 10], [12, 15]),
    )
    test("determinant(mat2(0,1, 0,2))", isFloat(0))
    test("determinant(mat2(0,1, 1,1))", isFloat(-1))
    test("determinant(mat3(0,1,1, 1,1,1, 1,2,3))", isFloat(-1))
    test("determinant(mat4(1,5,9,4, 2,6,1,5, 3,7,2,6, 4,8,3,8))", isFloat(-36))
    test("inverse(mat2(0,1, 1,1))", isMat([-1, 1], [1, -0]))
    test("inverse(mat2(4,2, 7,6))", isMat([0.6, -0.7], [-0.2, 0.4]))
    test(
      "inverse(mat3(0,1,1, 1,1,1, 1,2,3))",
      isMat([-1, 2, -1], [1, 1, -1], [-0, -1, 1]),
    )
    test(
      "inverse(mat4(1,5,9,4, 2,6,1,5, 3,7,2,6, 4,8,3,8))",
      is(
        mat(
          [-0.138888889, 0.027777778, 0.11111111, -0],
          [-1.72222222, -0.0555555555, -0.22222222, 1],
          [1.8611111111111112, 1.0277777777777777, 0.1111111111111111, -2],
          [-0.25, -0.75, -0, 1],
        ),
      ),
    )

    test("lessThan(vec3(2, 1, 0),vec3(1))", is([false, false, true]))
    test("lessThanEqual(vec3(2, 1, 0),vec3(1))", is([false, true, true]))
    test("greaterThan(vec3(2, 1, 0),vec3(1))", is([true, false, false]))
    test("greaterThanEqual(vec3(2, 1, 0),vec3(1))", is([true, true, false]))

    test("equal(vec2(1.), vec2(2.))", is([false, false]))
    test("notEqual(uvec3(3), uvec3(3))", is([false, false, false]))

    test("not(bvec3(0, 1, 1))", is([true, false, false]))
    test("all(bvec3(0, 1, 1))", is(false))
    test("any(bvec3(0, 1, 1))", is(true))

    test("dFdx(vec2(3.2))", isFloat(0))
    test("dFdy(vec2(3.2))", isFloat(0))
    test("fwidth(vec2(3.2))", isFloat(0))
  })
})
