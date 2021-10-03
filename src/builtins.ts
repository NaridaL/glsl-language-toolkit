import { clamp, pick } from "lodash"

const mathProps: (keyof Math)[] = [
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan2",
  "sinh",
  "cosh",
  "tanh",
  "asinh",
  "acosh",
  "atanh",
  "pow",
  "exp",
  "log",
  "log2",
  "sqrt",
  "abs",
  "sign",
  "floor",
  "trunc",
  "round",
  "ceil",
  "min",
  "max",
]
export const COMPONENT_FUNCTIONS = Object.assign(
  {
    radians: (degrees: number): number => (Math.PI / 180) * degrees,
    degrees: (radians: number): number => (180 / Math.PI) * radians,
    exp2: (x: number): number => Math.pow(2, x),
    inversesqrt: (x: number): number => 1 / Math.sqrt(x),
    roundEven: (n: number, d = 2): number => {
      const x = n * Math.pow(10, d)
      const r = Math.round(x)
      const br = Math.abs(x) % 1 === 0.5 ? (r % 2 === 0 ? r : r - 1) : r
      return br / Math.pow(10, d)
    },
    fract: (x: number): number => x - Math.floor(x),
    mod: (x: number, y: number): number => x - y * Math.floor(x / y),
    clamp,
    mix: (x: number, y: number, a: number): number => x * (1 - a) + y * a,
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
    floatBitsToUInt: (value: number): number => {
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
  },
  pick(Math, ...mathProps),
)

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
export const GEOMETRIC = {
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
  faceforward: (N: number[], I: number[], Nref: number[]): number[] =>
    dot(Nref, I) < 0 ? N : N.map((e) => -e),
  reflect: (I: number[], N: number[]): number[] => {
    const f = 2 * dot(N, I)
    return I.map((Ii, i) => Ii - f * N[i])
  },
  refract: (N: number[], I: number[], eta: number): number[] => {
    const k = 1.0 - eta * eta * (1.0 - dot(N, I) * dot(N, I))
    if (k < 0.0) {
      return N.map(() => 0.0)
    } else {
      const f = eta * dot(N, I) + Math.sqrt(k)
      return I.map((Ii, i) => eta * Ii - f * N[i])
    }
  },
}

export const MATRIX = {
  matrixCompMult: (x: number[], y: number[]): number[] =>
    x.map((xi, i) => xi * y[i]),

  // TODO
}

function componentWise2<X, Y, R>(
  f: (x: X, y: Y) => R,
): (x: X[], y: Y[]) => R[] {
  return (x, y) => x.map((xi, i) => f(xi, i[y]))
}
export const VECTOR_RELATIONAL = {
  lessThan: componentWise2((x: number, y: number): boolean => x < y),
  lessThanEqual: componentWise2((x: number, y: number): boolean => x <= y),
  greaterThan: componentWise2((x: number, y: number): boolean => x > y),
  greaterThanEqual: componentWise2((x: number, y: number): boolean => x >= y),
  equal: componentWise2((x: number, y: number): boolean => x === y),
  notEqual: componentWise2((x: number, y: number): boolean => x !== y),
  any: (x: boolean[]): boolean => x.some(Boolean),
  all: (x: boolean[]): boolean => x.every(Boolean),
  not: (x: boolean[]): boolean[] => x.map((xi) => !xi),
}
export const FRAGMENT_PROCESSING = {
  dFdx: (): number => 0,
  dFdy: (): number => 0,
  fwidth: (): number => 0,
}

// TODO : atan2
// TODO : modf
// TODO: test which checks constant expression values for large values
// TODO: test of the form `any(bvec(true, true))` for every function
// TODO :mix with genbtype
