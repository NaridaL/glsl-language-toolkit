import { clamp } from "lodash"
import {
  determinant2,
  determinant3,
  determinant4,
  inverse2,
  inverse3,
  inverse4,
} from "./matinverse"
import { invariant } from "./util"

const COMPONENT_FUNCTIONS = {
  radians: (degrees: number): number => (Math.PI / 180) * degrees,
  degrees: (radians: number): number => (180 / Math.PI) * radians,
  exp2: (x: number): number => Math.pow(2, x),
  inversesqrt: (x: number): number => 1 / Math.sqrt(x),
  roundEven: (n: number): number => {
    const r = Math.round(n)
    return r - +(Math.abs(n) % 1 === 0.5 && r % 2 !== 0)
  },
  fract: (x: number): number => x - Math.floor(x),
  mod: (x: number, y: number): number => x - y * Math.floor(x / y),
  clamp,
  mix: (x: number, y: number, a: number | boolean): number => {
    if (typeof a === "boolean") {
      return a ? y : x
    } else {
      return x * (1 - a) + y * a
    }
  },
  step: (edge: number, x: number): number => +(edge <= x),
  smoothstep: (edge0: number, edge1: number, x: number): number => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)
  },
  isnan: isNaN,
  isinf: (x: number): boolean => Math.abs(x) === Infinity,
  floatBitsToInt: (value: number): number => {
    const buf = new ArrayBuffer(4)
    new Float32Array(buf)[0] = value
    return new Int32Array(buf)[0]
  },
  floatBitsToUint: (value: number): number => {
    const buf = new ArrayBuffer(4)
    new Float32Array(buf)[0] = value
    return new Uint32Array(buf)[0]
  },
  intBitsToFloat: (value: number): number => {
    const buf = new ArrayBuffer(4)
    new Int32Array(buf)[0] = value
    return new Float32Array(buf)[0]
  },
  uintBitsToFloat: (value: number): number => {
    const buf = new ArrayBuffer(4)
    new Uint32Array(buf)[0] = value
    return new Float32Array(buf)[0]
  },
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: (yOrYOverX: number, x?: number) =>
    x === undefined ? Math.atan(yOrYOverX) : Math.atan2(yOrYOverX, x),
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  pow: Math.pow,
  exp: Math.exp,
  log: Math.log,
  log2: Math.log2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  trunc: Math.trunc,
  round: Math.round,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
}

const PACKING = {
  // TODO
}
const dot = (x: number[], y: number[]): number => {
  let result = 0
  for (let i = 0; i < x.length; i++) {
    result += x[i] * y[i]
  }
  return result
}
const GEOMETRIC = {
  length: (x: number[]): number => Math.hypot(...x),
  distance: (p0: number[], p1: number[]): number => {
    const diff = []
    for (let i = 0; i < p0.length; i++) {
      diff[i] = p0[i] - p1[i]
    }
    return Math.hypot(...diff)
  },
  dot,
  cross: (x: number[], y: number[]): number[] => [
    x[1] * y[2] - y[1] * x[2],
    x[2] * y[0] - y[2] * x[0],
    x[0] * y[1] - y[0] * x[1],
  ],
  normalize: (x: number[]): number[] => {
    const l = Math.hypot(...x)
    return x.map((xi) => xi / l)
  },

  faceforward: (N: number[], I: number[], Nref: number[]): number[] => {
    return dot(Nref, I) < 0 ? N : N.map((e) => -e)
  },

  reflect: (I: number[], N: number[]): number[] => {
    const f = 2 * dot(N, I)
    return I.map((Ii, i) => Ii - f * N[i])
  },

  refract: (I: number[], N: number[], eta: number): number[] => {
    const k = 1.0 - eta * eta * (1.0 - dot(N, I) * dot(N, I))
    if (k < 0.0) {
      return I.map(() => 0.0)
    } else {
      const f = eta * dot(N, I) + Math.sqrt(k)
      return I.map((Ii, i) => eta * Ii - f * N[i])
    }
  },
}

export type Matrix = number[] & { rows: number }

export function Matrix(cols: number, rows: number): Matrix {
  return Object.assign(new Array(cols * rows), { rows })
}

export function isMatrix(x: number[] | number): x is Matrix {
  return Array.isArray(x) && "rows" in x
}

const MATRIX = {
  matrixCompMult: (x: Matrix, y: Matrix): number[] => {
    return Object.assign(
      x.map((xi, i) => xi * y[i]),
      { rows: x.rows },
    )
  },

  outerProduct: (c: number[], r: number[]) => {
    const rows = c.length
    const cols = r.length
    const result = Matrix(cols, rows)
    for (let ci = 0; ci < cols; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        result[ci * rows + ri] = c[ri] * r[ci]
      }
    }
    return result
  },

  transpose: (m: Matrix) => {
    invariant(m.rows)
    const mCols = m.length / m.rows
    const result = Matrix(m.rows, mCols)
    for (let ci = 0; ci < m.rows; ci++) {
      for (let ri = 0; ri < mCols; ri++) {
        result[ci * mCols + ri] = m[ri * m.rows + ci]
      }
    }
    return result
  },
  determinant: (m: Matrix) => {
    invariant(m.rows)
    if (m.length === 16) {
      return determinant4(m)
    }
    if (m.length === 9) {
      return determinant3(m)
    }
    if (m.length === 4) {
      return determinant2(m)
    }
    invariant(false)
  },
  inverse: (m: Matrix) => {
    invariant(m.rows)
    if (m.length === 16) {
      return inverse4(m)
    }
    if (m.length === 9) {
      return inverse3(m)
    }
    if (m.length === 4) {
      return inverse2(m)
    }
    invariant(false)
  },
}

const VECTOR_RELATIONAL_COMPONENT_WISE = {
  lessThan: (x: number, y: number): boolean => x < y,
  lessThanEqual: (x: number, y: number): boolean => x <= y,
  greaterThan: (x: number, y: number): boolean => x > y,
  greaterThanEqual: (x: number, y: number): boolean => x >= y,
  equal: (x: number, y: number): boolean => x === y,
  notEqual: (x: number, y: number): boolean => x !== y,
}
const VECTOR_RELATIONAL = {
  any: (x: boolean[]): boolean => x.some(Boolean),
  all: (x: boolean[]): boolean => x.every(Boolean),
  not: (x: boolean[]): boolean[] => x.map((xi) => !xi),
}
const FRAGMENT_PROCESSING = {
  dFdx: (): number => 0,
  dFdy: (): number => 0,
  fwidth: (): number => 0,
}

const AS_WHOLE: Record<string, (...args: any[]) => any> = Object.assign(
  {},
  GEOMETRIC,
  VECTOR_RELATIONAL,
  FRAGMENT_PROCESSING,
  MATRIX,
  PACKING,
)
const COMPONENT_WISE: Record<string, (...args: any[]) => any> = Object.assign(
  {},
  COMPONENT_FUNCTIONS,
  VECTOR_RELATIONAL_COMPONENT_WISE,
)

// TODO : modf
// TODO: test which checks constant expression values for large values
// TODO: test of the form `any(bvec(true, true))` for every function

export function applyBuiltinFunction(name: string, args: any[]): any {
  let f: (...args: any[]) => any
  if ((f = AS_WHOLE[name])) {
    return f(...args)
  } else if ((f = COMPONENT_WISE[name])) {
    const arrArg = args.find(Array.isArray)
    if (arrArg) {
      const result = arrArg.map((_, i) =>
        f(...args.map((a) => (Array.isArray(a) ? a[i] : a))),
      )
      if ("rows" in arrArg) {
        Object.assign(result, { rows: (arrArg as Matrix).rows })
      }
      return result
    } else {
      return f(...args)
    }
  }
}
