/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as path from "path"
import { readFileSync } from "fs"
import { last, pick } from "lodash"
import { TokenType } from "chevrotain"

import {
  AbstractVisitor,
  ArrayAccess,
  ArraySpecifier,
  AssignmentExpression,
  BinaryExpression,
  CommaExpression,
  CompoundStatement,
  ConditionalExpression,
  ConstantExpression,
  Declarator,
  DoWhileStatement,
  FieldAccess,
  ForStatement,
  FullySpecifiedType,
  FunctionCall,
  FunctionDefinition,
  FunctionPrototype,
  InitDeclaratorListDeclaration,
  isExpression,
  isToken,
  MethodCall,
  Node,
  ParameterDeclaration,
  PostfixExpression,
  ReturnStatement,
  SelectionStatement,
  StructSpecifier,
  SwitchStatement,
  Token,
  TranslationUnit,
  TypeSpecifier,
  UnaryExpression,
  UniformBlock,
  VariableExpression,
  WhileStatement,
} from "./nodes"
import { doOp, isIdentifier, TOKEN } from "./lexer"
import { applyBuiltinFunction, Matrix } from "./builtins"
import { parseInput } from "./parser"
import {
  allDefined,
  assertNever,
  CheckError,
  mapExpandedLocation,
  safeMap,
} from "./util"
import { ERRORS } from "./errors"

type BasicType = Readonly<{ kind: "basic"; type: TokenType }>
type ArrayType = Readonly<{
  kind: "array"
  of: NormalizedType | undefined
  size: number
}>
type StructType = Readonly<{
  kind: "struct"
  specifier: StructSpecifier
  fields: {
    [name: string]: {
      type: NormalizedType | undefined
      declarator: Declarator
    }
  }
}>
export type ShaderType = "vertex" | "fragment"

function isVectorType(n: NormalizedType | undefined): n is BasicType {
  return n?.kind === "basic" && getVectorSize(n.type) !== 0
}

type NormalizedType = BasicType | ArrayType | StructType

function BasicType(type?: TokenType): NormalizedType | undefined {
  return type && { kind: "basic", type }
}

namespace BasicType {
  export const FLOAT: NormalizedType = { kind: "basic", type: TOKEN.FLOAT }
  export const BOOL: NormalizedType = { kind: "basic", type: TOKEN.BOOL }
  export const VOID: NormalizedType = { kind: "basic", type: TOKEN.VOID }
  export const INT: NormalizedType = { kind: "basic", type: TOKEN.INT }
  export const UINT: NormalizedType = { kind: "basic", type: TOKEN.UINT }
}

let errors: CheckError[] = []

function markError(
  where: Token | Node,
  code: string,
  ...args: (NormalizedType[] | NormalizedType | string | number | undefined)[]
) {
  const message = code + ": " + ERRORS[code] + args.join(" ")
  errors.push({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    loc: mapExpandedLocation(where),
    where,
    code,
    message,
    error: new Error(message),
  })
}

export function typeString(t: NormalizedType | undefined): string {
  if (!t) {
    return "unknown"
  } else if (t.kind === "basic") {
    return t.type.LABEL ?? (t.type.PATTERN as string)
  } else if (t.kind === "array") {
    return typeString(t.of) + "[" + t.size + "]"
  } else if (t.kind === "struct") {
    return t.specifier.name
      ? "struct " + t.specifier.name.image
      : "anonymous struct"
  } else {
    assertNever(t)
  }
}

function isLValue(n: Node): boolean {
  switch (n.kind) {
    case "variableExpression":
      // true if binding wasn't resolved to avoid bogus errors
      return (
        !n.binding ||
        (!n.binding?.declaratorList?.fsType.typeQualifier?.storageQualifier
          ?.CONST &&
          !n.binding.parameter?.parameterTypeQualifier)
      )
    case "fieldAccess":
      return isLValue(n.on)
    case "arrayAccess":
      return isLValue(n.on)
    default:
      return false
  }
}

function getVectorSize(t: TokenType): number {
  switch (t) {
    case TOKEN.VEC2:
    case TOKEN.IVEC2:
    case TOKEN.UVEC2:
    case TOKEN.BVEC2:
      return 2
    case TOKEN.VEC3:
    case TOKEN.IVEC3:
    case TOKEN.UVEC3:
    case TOKEN.BVEC3:
      return 3
    case TOKEN.VEC4:
    case TOKEN.IVEC4:
    case TOKEN.UVEC4:
    case TOKEN.BVEC4:
      return 4
    default:
      return 0
  }
}

function getVectorElementType(t: TokenType): TokenType | undefined {
  switch (t) {
    case TOKEN.BVEC2:
    case TOKEN.BVEC3:
    case TOKEN.BVEC4:
      return TOKEN.BOOL
    case TOKEN.IVEC2:
    case TOKEN.IVEC3:
    case TOKEN.IVEC4:
      return TOKEN.INT
    case TOKEN.UVEC2:
    case TOKEN.UVEC3:
    case TOKEN.UVEC4:
      return TOKEN.UINT
    case TOKEN.VEC2:
    case TOKEN.VEC3:
    case TOKEN.VEC4:
      return TOKEN.FLOAT
    default:
      return undefined
  }
}

function getVectorType(
  element: TokenType,
  size: number,
): TokenType | undefined {
  switch (element) {
    case TOKEN.BOOL:
      return [TOKEN.BOOL, TOKEN.BVEC2, TOKEN.BVEC3, TOKEN.BVEC4][size - 1]
    case TOKEN.INT:
      return [TOKEN.INT, TOKEN.IVEC2, TOKEN.IVEC3, TOKEN.IVEC4][size - 1]
    case TOKEN.UINT:
      return [TOKEN.UINT, TOKEN.UVEC2, TOKEN.UVEC3, TOKEN.UVEC4][size - 1]
    case TOKEN.FLOAT:
      return [TOKEN.FLOAT, TOKEN.VEC2, TOKEN.VEC3, TOKEN.VEC4][size - 1]
    default:
      return undefined
  }
}

function getComponentCount(t: TokenType): number {
  const mDims = getMatrixDimensions(t)
  if (mDims) {
    return mDims[0] * mDims[1]
  }
  const vDim = getVectorSize(t)
  if (vDim) {
    return vDim
  }
  if (getScalarType(t)) {
    return 1
  }
  return 0
}

function getComponentType(t: TokenType): TokenType | undefined {
  return getMatrixDimensions(t)
    ? TOKEN.FLOAT
    : getVectorElementType(t) || getScalarType(t)
}

type TypeAndValue = { type: NormalizedType; value: any }

function evaluateBinaryOp(
  op: TokenType,
  a: any,
  b: any,
  aType: TokenType,
): TypeAndValue {
  const value = doOp(op, a, b)
  if (typeof value === "boolean") {
    return {
      type: BasicType.BOOL,
      value: value,
    }
  } else if (aType === TOKEN.FLOAT) {
    return {
      type: BasicType.FLOAT,
      value: Math.fround(value as number),
    }
  } else if (aType === TOKEN.INT) {
    return {
      type: BasicType.INT,
      value: value | 0,
    }
  } else if (aType === TOKEN.UINT) {
    return {
      type: BasicType.INT,
      value: mod(value, 0x1_0000_0000),
    }
  } else {
    throw new Error()
  }
}

function mod(x: number, a: number) {
  return ((x % a) + a) % a
}

function norm(type: TokenType, value: number | boolean) {
  switch (type) {
    case TOKEN.BOOL:
      return !!value
    case TOKEN.FLOAT:
      return Math.fround(+value)
    case TOKEN.INT:
      return +value | 0
    case TOKEN.UINT:
      return mod(+value, 0x1_0000_0000)
    default:
      throw new Error(type.name)
  }
}

function getScalarType(t: TokenType): TokenType | undefined {
  switch (t) {
    case TOKEN.FLOAT:
    case TOKEN.INT:
    case TOKEN.UINT:
    case TOKEN.BOOL:
      return t
    default:
      return undefined
  }
}

function doMatrixMult(a: Matrix, b: Matrix): Matrix {
  const rows = a.rows
  const cols = b.length / b.rows
  const result = Object.assign(Array(cols * rows), { rows })
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let v = 0
      for (let i = 0; i < b.rows; i++) {
        v += a[i * a.rows + r] * b[c * b.rows + i]
      }
      result[c * rows + r] = v
    }
  }
  return result
}

function evalIntConstant(s: string) {
  return s.length >= 2 && s[0] === "0" && s[1] !== "x"
    ? parseInt(s, 8)
    : Number(s)
}

export function evaluateConstantExpression(n: Node): TypeAndValue | undefined {
  return CONSTANT_VISITOR.eval(n)
}

const CONSTANT_VISITOR = new (class extends AbstractVisitor<
  TypeAndValue | undefined
> {
  public eval(n: Node): TypeAndValue | undefined {
    return super.visit(n)
  }

  protected constantExpression(
    n: ConstantExpression,
  ): TypeAndValue | undefined {
    switch (n.const_.tokenType) {
      case TOKEN.FLOATCONSTANT:
        return {
          type: BasicType.FLOAT,
          value: +n.const_.image,
        }
      case TOKEN.BOOLCONSTANT:
        return {
          type: BasicType.BOOL,
          value: n.const_.image === "true",
        }
      case TOKEN.INTCONSTANT:
        return {
          type: BasicType.INT,
          value: evalIntConstant(n.const_.image),
        }
      case TOKEN.UINTCONSTANT:
        return {
          type: BasicType.UINT,
          value: evalIntConstant(
            n.const_.image.substring(0, n.const_.image.length - 1),
          ),
        }
      default:
        throw new Error()
    }
  }

  protected unaryExpression(n: UnaryExpression): TypeAndValue | undefined {
    const on = this.visit(n.on)
    if (!on) {
      return undefined
    }
    if (on.type.kind !== "basic") {
      throw new Error()
    }
    const compType = getComponentType(on.type.type)!
    const opp = (op: TokenType, on: number, t: TokenType) => {
      switch (op) {
        case TOKEN.TILDE:
          return norm(t, ~on)
        case TOKEN.BANG:
          return norm(t, !on)
        case TOKEN.DASH:
          return norm(t, -on)
        default:
          assertNever()
      }
    }
    let value
    if (getScalarType(on.type.type)) {
      value = opp(n.op.tokenType, on.value, compType)
    } else {
      value = (on.value as any[]).map((e) => opp(n.op.tokenType, e, compType))
      Object.assign(value, pick(on.value, "rows"))
    }
    return { type: on.type, value }
  }

  protected binaryExpression(n: BinaryExpression): TypeAndValue | undefined {
    const l = this.visit(n.lhs)
    const r = this.visit(n.rhs)
    if (l?.type.kind !== "basic" || r?.type.kind !== "basic") {
      return undefined
    }
    const lType = l.type.type
    const rType = r.type.type
    const op = n.op.tokenType
    const type: BasicType = {
      kind: "basic",
      type: VALID_BINARY_OPERATIONS.find(
        ([op, lhs, rhs, _result]) =>
          op === op && lhs === lType && rhs === rType,
      )![3],
    }
    let value
    if (getScalarType(lType) && getScalarType(rType)) {
      value = norm(lType, doOp(op, l.value, r.value))
    } else if (getVectorSize(lType) && getVectorSize(rType)) {
      // two vectors
      value = (l.value as any[]).map((lv, i) =>
        norm(getComponentType(lType)!, doOp(op, lv, (r.value as any[])[i])),
      )
    } else if (getVectorSize(lType) && getScalarType(rType)) {
      value = (l.value as any[]).map((lv) => norm(rType, doOp(op, lv, r.value)))
    } else if (getMatrixDimensions(lType) && getScalarType(rType)) {
      const a = l.value as Matrix
      value = Matrix(a.length / a.rows, a.rows)
      for (let i = 0; i < a.length; i++) {
        value[i] = Math.fround(doOp(op, a[i], r.value))
      }
    } else if (getScalarType(lType) && getMatrixDimensions(rType)) {
      const b = r.value as Matrix
      value = Matrix(b.length / b.rows, b.rows)
      for (let i = 0; i < b.length; i++) {
        value[i] = Math.fround(doOp(op, l.value, b[i]))
      }
    } else if (getScalarType(lType) && getVectorSize(rType)) {
      value = (r.value as any[]).map((rv) => norm(lType, doOp(op, l.value, rv)))
    } else if (isMatrixType(l.type) || isMatrixType(r.type)) {
      if (op === TOKEN.STAR) {
        const ll = isVectorType(l.type)
          ? Object.assign([], l.value, { rows: 1 })
          : l.value
        const rr = isVectorType(r.type)
          ? Object.assign([], r.value, { rows: (r.value as number[]).length })
          : r.value

        value = doMatrixMult(ll, rr)
        if (!getMatrixDimensions(type.type)) {
          delete (value as any).rows
        }
      } else {
        // component wise operation on two matrices
        const a = l.value as Matrix
        value = Matrix(a.length / a.rows, a.rows)
        for (let i = 0; i < a.length; i++) {
          value[i] = Math.fround(doOp(op, a[i], (r.value as Matrix)[i]))
        }
      }
    } else {
      throw new Error()
    }
    return { type, value }
  }

  protected arrayAccess(n: ArrayAccess): TypeAndValue | undefined {
    const on = this.visit(n.on)
    if (!on) {
      return undefined
    }
    const index = this.visit(n.index)
    if (!index) {
      return undefined
    }
    const value1 = index.value as number
    if (on.type.kind === "array") {
      const ofType = on.type.of
      return (
        index && ofType && { type: ofType, value: (on.value as any[])[value1] }
      )
    } else if (on.type.kind === "basic") {
      if (getVectorSize(on.type.type)) {
        return {
          type: { kind: "basic", type: getComponentType(on.type.type)! },
          value: (on.value as any[])[value1],
        }
      } else if (getMatrixDimensions(on.type.type)) {
        const [, rows] = getMatrixDimensions(on.type.type)!
        return {
          type: { kind: "basic", type: getVectorType(TOKEN.FLOAT, rows)! },
          value: (on.value as any[]).slice(value1 * rows, (value1 + 1) * rows),
        }
      }
    }
    throw new Error()
  }

  protected functionCall(n: FunctionCall): TypeAndValue | undefined {
    const args = n.args.map((a) => this.visit(a))
    if (!allDefined(args)) {
      return undefined
    }
    if (n.binding) {
      // function call
      const type = findMatchingFunctionDefinition(
        args.map((a) => a.type),
        n.binding,
      )!.result
      const compType = getComponentType((type as BasicType).type)!
      const value = safeMap(
        applyBuiltinFunction(
          (n.callee.typeSpecifierNonArray as Token).image,
          args.map((a) => a.value),
        ),
        (x) => norm(compType, x),
      )
      return { type, value }
    } else if (n.constructorType) {
      // constructor

      const cType = n.constructorType
      if (cType.kind === "array") {
        // array constructor
        if (cType.size === args.length) {
          return {
            type: cType,
            value: args.map((a) => a.value),
          }
        } else {
          return undefined
        }
      } else if (cType.kind === "struct") {
        const value: Record<string, unknown> = {}
        const fields = Object.keys(cType.fields)
        for (let i = 0; i < fields.length; i++) {
          value[fields[i]] = args[i].value
        }
        return { type: cType, value }
      } else {
        // basic type constructor call

        const matDims = getMatrixDimensions(cType.type)
        if (matDims && args.length === 1 && isMatrixType(args[0].type)) {
          // this is the matXxY(matZxW) case
          const [cols, rows] = matDims
          const o = args[0].value as number[]
          const [oCols, oRows] = getMatrixDimensions(args[0].type.type)!
          const value = Object.assign(Array(cols * rows), { rows })
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              value[c * rows + r] =
                c < oCols && r < oRows ? o[c * oRows + r] : +(c === r)
            }
          }
          return { type: { kind: "basic", type: cType.type }, value }
        }
        const neededSize = getComponentCount(cType.type)
        const neededType = getComponentType(cType.type)!
        let result = args
          .map((arg) => arg.value)
          .flatMap<any>((arg) => (Array.isArray(arg) ? arg : [arg]))
          .slice(0, neededSize)
          .map((e) => norm(neededType, e))
        if (result.length === 1) {
          if (getVectorSize(cType.type)) {
            result = Array(neededSize).fill(result[0])
          } else if (matDims) {
            const [cols, rows] = matDims
            const mat = Object.assign(Array(cols * rows).fill(0), { rows })
            for (let i = 0; i < Math.min(cols, rows); i++) {
              mat[i * rows + i] = result[0]
            }
            result = mat
          }
        }
        if (matDims) {
          Object.assign(result, { rows: matDims[1] })
        }
        return {
          type: { kind: "basic", type: cType.type },
          value: neededSize === 1 ? result[0] : result,
        }
      }
    }
    throw new Error()
  }

  protected commaExpression(_n: CommaExpression): TypeAndValue | undefined {
    return undefined
  }

  protected methodCall(n: MethodCall): TypeAndValue | undefined {
    const oType = CHECKER_VISITOR.check(n.on, undefined)
    if (oType?.kind === "array") {
      return { type: BasicType.INT, value: oType.size }
    }
    return undefined
  }

  protected variableExpression(
    n: VariableExpression,
  ): TypeAndValue | undefined {
    const binding = n.binding
    return (
      binding?.declaratorList?.fsType.typeQualifier?.storageQualifier?.CONST &&
      binding.declarator?.init &&
      this.visit(binding.declarator?.init)
    )
  }

  protected fieldAccess(n: FieldAccess): TypeAndValue | undefined {
    const on = this.visit(n.on)
    if (!on) {
      return
    }
    const f = n.field.image
    if (isVectorType(on.type)) {
      const swizzle = f.split("").map((e) => {
        const vectorFieldIndex = "xyzwrgbastpq".indexOf(e) % 4
        return (on.value as any[])[vectorFieldIndex]
      })
      const value = swizzle.length === 1 ? swizzle[0] : swizzle
      return {
        type: {
          kind: "basic",
          type: getVectorType(getComponentType(on.type.type)!, swizzle.length)!,
        },
        value,
      }
    } else if (on.type.kind === "struct") {
      const fieldType = on.type.fields[f].type
      return (
        fieldType && {
          type: fieldType,
          value: (on.value as Record<string, unknown>)[f],
        }
      )
    }
    throw new Error()
  }
})()

interface FunctionBinding {
  kind: "function"
  overloads: {
    params: NormalizedType[]
    result: NormalizedType
    def: FunctionDefinition | FunctionPrototype
  }[]
  builtIn: boolean
}

interface StructBinding {
  kind: "struct"
  type: StructType
}

interface VariableBinding {
  kind: "variable"
  declaratorList?: InitDeclaratorListDeclaration
  declarator?: Declarator
  parameter?: ParameterDeclaration
  type: NormalizedType | undefined
}

type Binding = StructBinding | VariableBinding | FunctionBinding

declare module "./nodes" {
  export interface FunctionCall extends BaseNode {
    constructorType?: NormalizedType
    binding?: FunctionBinding
  }

  export interface VariableExpression extends BaseNode {
    binding?: VariableBinding
  }

  export interface FunctionDefinition extends BaseNode {
    returnTypeResolved?: NormalizedType
  }

  export interface FunctionPrototype extends BaseNode {
    returnTypeResolved?: NormalizedType
  }

  export interface TypeSpecifier extends BaseNode {
    typeSpecifierNonArrayBinding?: StructBinding
  }

  export interface BaseExpressionNode {
    resolvedType?: NormalizedType
  }
}

interface Scope {
  parent: Scope | undefined
  defs: {
    [k: string]: Binding
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isTokenType(type: TokenType | StructSpecifier): type is TokenType {
  return typeof type.name === "string"
}

function typeEquals(
  a: NormalizedType | undefined,
  b: NormalizedType | undefined,
): boolean {
  if (!a || !b) {
    return false
  }
  switch (a.kind) {
    case "basic":
      return b.kind === "basic" && a.type === b.type
    case "array":
      return b.kind === "array" && a.size === b.size && typeEquals(a.of, b.of)
    case "struct":
      return b.kind === "struct" && a.specifier === b.specifier
    default:
      assertNever(a)
  }
}

function typeNotEquals(
  a: NormalizedType | undefined,
  b: NormalizedType | undefined,
): boolean {
  if (!a || !b) {
    return false
  }
  return !typeEquals(a, b)
}

function findMatchingFunctionDefinition(
  paramTypes: NormalizedType[],
  functionBinding: FunctionBinding,
) {
  const overloads = functionBinding.overloads
  for (const overload of overloads) {
    if (typesEquals(overload.params, paramTypes)) {
      return overload
    }
  }
  return undefined
}

function getGenTypes(ts: TypeSpecifier): TokenType[] | undefined {
  return isToken(ts.typeSpecifierNonArray) &&
    ts.typeSpecifierNonArray.tokenType === TOKEN.NON_PP_IDENTIFIER
    ? GEN_TYPES[ts.typeSpecifierNonArray.image]
    : undefined
}

class BinderVisitor extends AbstractVisitor<any> {
  protected scopes: Scope[] = []

  private BUILTIN_SCOPE: Scope | undefined = undefined

  private currentFunctionPrototypeParams:
    | (NormalizedType | undefined)[]
    | undefined = undefined

  private doingBuiltIns = false

  protected get scope() {
    const s = last(this.scopes)
    if (!s) {
      throw new Error()
    }
    return s
  }

  public builtins(n: TranslationUnit): void {
    this.doingBuiltIns = true
    this.translationUnit(n)
    this.doingBuiltIns = false
  }

  public bind(u: TranslationUnit): void {
    super.visit(u)
  }

  protected structSpecifier(n: StructSpecifier): any {
    const fields: StructType["fields"] = {}
    for (const declaration of n.declarations) {
      declaration.kind
      for (const declarator of declaration.declarators) {
        // Bind array specifier and initializer first.
        this.declarator(declarator)

        if (fields[declarator.name.image]) {
          markError(declarator.name, "field already exists in this struct")
        } else {
          fields[declarator.name.image] = {
            type: this.figure(declaration.fsType, declarator.arraySpecifier),
            declarator: declarator,
          }
        }
      }
    }

    if (n.name) {
      const existingDef = this.scope.defs[n.name.image]
      if (existingDef) {
        markError(n, "S0022")
      } else {
        this.scope.defs[n.name.image] = {
          kind: "struct",
          type: { kind: "struct", fields, specifier: n },
        }
      }
    }
  }

  protected resolve(symbol: string): Binding | undefined {
    let scope: Scope | undefined = this.scope
    while (scope) {
      const x = scope.defs[symbol]
      if (x) {
        return x
      }
      scope = scope.parent
    }
  }

  protected variableExpression(n: VariableExpression) {
    const binding = this.resolve(n.var.image)
    if (binding) {
      if (binding.kind === "variable") {
        n.binding = binding
      } else {
        markError(n, "Expected variable but was " + binding.kind)
      }
    } else {
      markError(n, "G0002")
    }
  }

  protected methodCall(n: MethodCall): any {
    this.visit(n.on)
    // the function call can only be ".length()" so there is nothing to bind
  }

  protected functionCall(n: FunctionCall): any {
    super.functionCall(n)
    const ts = n.callee
    if (isToken(ts.typeSpecifierNonArray)) {
      if (isIdentifier(ts.typeSpecifierNonArray) && !ts.arraySpecifier) {
        // this could be a regular function call (not a constructor)
        const b = this.resolve(ts.typeSpecifierNonArray.image)
        if (b?.kind === "function") {
          n.binding = b
          return
        }
      }
      // assume it is a constructor
      n.constructorType = this.figure(ts, undefined)
      if (
        n.constructorType?.kind === "array" &&
        ts.arraySpecifier &&
        !ts.arraySpecifier.size
      ) {
        Object.assign(n.constructorType, { size: n.args.length })
      }
    } else {
      markError(ts, "structure definition cannot be constructor")
    }
  }

  protected initDeclaratorListDeclaration(n: InitDeclaratorListDeclaration) {
    this.visit(n.fsType)
    for (const d of n.declarators) {
      // Bind array specifier and initializer first.
      this.declarator(d)

      const existingDef = this.scope.defs[d.name.image]
      if (existingDef) {
        markError(d, "S0022")
      } else {
        this.scope.defs[d.name.image] = {
          kind: "variable",
          declaratorList: n,
          declarator: d,
          type: this.figure(n.fsType, d.arraySpecifier),
        }
      }
    }
  }

  protected translationUnit(n: TranslationUnit) {
    if (this.BUILTIN_SCOPE) {
      this.scopes = [this.BUILTIN_SCOPE]
    }
    this.pushScope()
    super.translationUnit(n)
    if (this.doingBuiltIns) {
      this.BUILTIN_SCOPE = this.scope
    }
    const f = (x: NormalizedType) => (x as BasicType)?.type?.PATTERN || "FAIL"
    const xx = Object.entries(this.BUILTIN_SCOPE!.defs)
      .flatMap(([name, binding]) => {
        if (binding.kind !== "function") {
          return []
        }
        return binding.overloads.map(
          (o) =>
            f(o.result) +
            " " +
            name +
            "(" +
            o.params.map(f).join(", ") +
            ");\n",
        )
      })
      .join("")
    this.popScope()
  }

  protected functionPrototype(n: FunctionPrototype): any {
    return this.functionDefinition(n)
  }

  protected functionDefinition(n: FunctionDefinition | FunctionPrototype) {
    this.visit(n.returnType)
    this.pushScope()
    if (this.currentFunctionPrototypeParams) {
      throw new Error()
    }
    this.currentFunctionPrototypeParams = []
    for (const param of n.params) {
      this.visit(param)
    }
    const params = this.currentFunctionPrototypeParams
    this.currentFunctionPrototypeParams = undefined
    if ("body" in n) {
      this.visit(n.body)
    }
    this.popScope()
    if (!this.doingBuiltIns) {
      const b = this.resolve(n.name.image)
      if (b?.kind === "function" && b.builtIn) {
        markError(n.name, "S0054")
      }
    }
    const existingDef = this.scope.defs[n.name.image]
    let def: FunctionBinding
    if (existingDef) {
      if (existingDef.kind !== "function") {
        markError(n.name, "S0024")
        return
      } else if (allDefined(params)) {
        // TODO: error if
        findMatchingFunctionDefinition(params, existingDef)
      }
      def = existingDef
    } else {
      def = this.scope.defs[n.name.image] = {
        kind: "function",
        overloads: [],
        builtIn: this.doingBuiltIns,
      }
    }
    const returnTypeResolved = this.figure(
      n.returnType.typeSpecifier,
      undefined,
    )!
    if (this.doingBuiltIns) {
      const genTypes =
        getGenTypes(n.returnType.typeSpecifier) ||
        n.params.map((p) => getGenTypes(p.typeSpecifier)).find(Boolean)

      if (genTypes) {
        for (let ti = 0; ti < genTypes.length; ti++) {
          const type = genTypes[ti]
          const normalized: NormalizedType = { kind: "basic", type }
          def.overloads.push({
            def: n,
            params: n.params.map(
              (p, pi): NormalizedType =>
                BasicType(getGenTypes(p.typeSpecifier)?.[ti]) ?? params[pi]!,
            ),
            result: getGenTypes(n.returnType.typeSpecifier)
              ? normalized
              : returnTypeResolved,
          })
        }
      } else {
        def.overloads.push({
          def: n,
          params: params as NormalizedType[],
          result: returnTypeResolved,
        })
      }
    } else {
      def.overloads.push({
        def: n,
        params: params as NormalizedType[],
        result: returnTypeResolved,
      })
      n.returnTypeResolved = this.figure(n.returnType, undefined)
    }
  }

  protected parameterDeclaration(n: ParameterDeclaration) {
    super.parameterDeclaration(n)

    const type = this.figure(n.typeSpecifier, n.arraySpecifier)
    this.currentFunctionPrototypeParams!.push(type)
    if (!isToken(n.typeSpecifier.typeSpecifierNonArray)) {
      markError(n.typeSpecifier.typeSpecifierNonArray, "C0001")
    }
    if (n.pName) {
      const existingDef = this.scope.defs[n.pName.image]
      if (existingDef) {
        markError(n, "S0022")
      } else {
        this.scope.defs[n.pName.image] = {
          kind: "variable",
          parameter: n,
          type,
        }
      }
    }
  }

  protected compoundStatement(n: CompoundStatement) {
    this.pushScope()
    super.compoundStatement(n)
    this.popScope()
  }

  protected pushScope() {
    this.scopes.push({ parent: last(this.scopes), defs: {} })
  }

  protected popScope() {
    this.scopes.pop()
  }

  protected figure(
    typeSpecifier: FullySpecifiedType | TypeSpecifier,
    arraySpecifier: ArraySpecifier | undefined,
  ): NormalizedType | undefined {
    if (typeSpecifier.kind === "fullySpecifiedType") {
      typeSpecifier = typeSpecifier.typeSpecifier
    }
    const typeSpecifierNonArray = typeSpecifier.typeSpecifierNonArray
    let result: NormalizedType | undefined
    if (isToken(typeSpecifierNonArray)) {
      if (isIdentifier(typeSpecifierNonArray)) {
        // refers to a struct
        const binding = this.resolve(typeSpecifierNonArray.image)
        if (binding?.kind === "struct") {
          result = binding.type
          typeSpecifier.typeSpecifierNonArrayBinding = binding
        } else if (binding) {
          markError(
            typeSpecifierNonArray,
            typeSpecifierNonArray.image + " refers to TODO, not a struct",
          )
        }
      } else {
        result = { kind: "basic", type: typeSpecifierNonArray.tokenType }
      }
      for (const as of [typeSpecifier.arraySpecifier, arraySpecifier]) {
        if (as) {
          const size =
            as.size === undefined
              ? -1
              : +(CONSTANT_VISITOR.eval(as.size)?.value ?? 0)
          result = { kind: "array", of: result, size }
        }
      }
    } else {
      if (typeSpecifierNonArray.name) {
        const binding = this.resolve(typeSpecifierNonArray.name.image)
        if (binding?.kind === "struct") {
          result = binding.type
        }
      }
    }
    return result
  }
}

function getAssignOpBinaryOp(t: TokenType): TokenType {
  switch (t) {
    case TOKEN.MULASSIGN:
      return TOKEN.STAR
    case TOKEN.DIVASSIGN:
      return TOKEN.SLASH
    case TOKEN.MODASSIGN:
      return TOKEN.PERCENT
    case TOKEN.ADDASSIGN:
      return TOKEN.PLUS
    case TOKEN.SUBASSIGN:
      return TOKEN.DASH
    case TOKEN.LEFTASSIGN:
      return TOKEN.LEFT_OP
    case TOKEN.RIGHTASSIGN:
      return TOKEN.RIGHT_OP
    case TOKEN.ANDASSIGN:
      return TOKEN.AMPERSAND
    case TOKEN.XORASSIGN:
      return TOKEN.CARET
    case TOKEN.ORASSIGN:
      return TOKEN.VERTICAL_BAR
    default:
      assertNever()
  }
}

function getConstantType(t: TokenType): TokenType {
  switch (t) {
    case TOKEN.INTCONSTANT:
      return TOKEN.INT
    case TOKEN.UINTCONSTANT:
      return TOKEN.UINT
    case TOKEN.FLOATCONSTANT:
      return TOKEN.FLOAT
    case TOKEN.BOOLCONSTANT:
      return TOKEN.BOOL
    default:
      assertNever()
  }
}

function isMatrixType(n: NormalizedType | undefined): n is BasicType {
  return n?.kind === "basic" && getMatrixDimensions(n.type) !== undefined
}

const MATRIX_TYPES = [
  TOKEN.MAT2X2,
  TOKEN.MAT2X3,
  TOKEN.MAT2X4,
  TOKEN.MAT3X2,
  TOKEN.MAT3X3,
  TOKEN.MAT3X4,
  TOKEN.MAT4X2,
  TOKEN.MAT4X3,
  TOKEN.MAT4X4,
]

const GEN_TYPES: Readonly<Record<string, TokenType[]>> = {
  bvec: [TOKEN.BVEC2, TOKEN.BVEC3, TOKEN.BVEC4],
  genBType: [TOKEN.BOOL, TOKEN.BVEC2, TOKEN.BVEC3, TOKEN.BVEC4],
  genIType: [TOKEN.INT, TOKEN.IVEC2, TOKEN.IVEC3, TOKEN.IVEC4],
  genType: [TOKEN.FLOAT, TOKEN.VEC2, TOKEN.VEC3, TOKEN.VEC4],
  genUType: [TOKEN.UINT, TOKEN.UVEC2, TOKEN.UVEC3, TOKEN.UVEC4],
  gsampler2D: [TOKEN.SAMPLER2D, TOKEN.ISAMPLER2D, TOKEN.USAMPLER2D],
  gsampler2DArray: [
    TOKEN.SAMPLER2DARRAY,
    TOKEN.ISAMPLER2DARRAY,
    TOKEN.USAMPLER2DARRAY,
  ],
  gsampler3D: [TOKEN.SAMPLER3D, TOKEN.ISAMPLER3D, TOKEN.USAMPLER3D],
  gsamplerCube: [TOKEN.SAMPLERCUBE, TOKEN.ISAMPLERCUBE, TOKEN.USAMPLERCUBE],
  gvec4: [TOKEN.VEC4, TOKEN.IVEC4, TOKEN.UVEC4],
  ivec: [TOKEN.IVEC2, TOKEN.IVEC3, TOKEN.IVEC4],
  mat: MATRIX_TYPES,
  uvec: [TOKEN.UVEC2, TOKEN.UVEC3, TOKEN.UVEC4],
  vec: [TOKEN.VEC2, TOKEN.VEC3, TOKEN.VEC4],
}

const VEC_TYPES = [TOKEN.VEC2, TOKEN.VEC3, TOKEN.VEC4]
const UVEC_TYPES = [TOKEN.UVEC2, TOKEN.UVEC3, TOKEN.UVEC4]
const IVEC_TYPES = [TOKEN.IVEC2, TOKEN.IVEC3, TOKEN.IVEC4]
type BinOp = [op: TokenType, lhs: TokenType, rhs: TokenType, res: TokenType]
const VALID_BINARY_OPERATIONS: BinOp[] = [
  ...[TOKEN.PLUS, TOKEN.DASH, TOKEN.STAR, TOKEN.SLASH].flatMap<BinOp>((op) => [
    // the two operators are scalars
    [op, TOKEN.FLOAT, TOKEN.FLOAT, TOKEN.FLOAT],
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    // one is a scalar, the other is a vector or matrix
    ...[...VEC_TYPES, ...MATRIX_TYPES].flatMap<BinOp>((t) => [
      [op, TOKEN.FLOAT, t, t],
      [op, t, TOKEN.FLOAT, t],
    ]),
    ...IVEC_TYPES.flatMap<BinOp>((t) => [
      [op, TOKEN.INT, t, t],
      [op, t, TOKEN.INT, t],
    ]),
    ...UVEC_TYPES.flatMap<BinOp>((t) => [
      [op, TOKEN.UINT, t, t],
      [op, t, TOKEN.UINT, t],
    ]),
    // the two operands are vectors of the same size
    ...[...VEC_TYPES, ...UVEC_TYPES, ...IVEC_TYPES].map<BinOp>((t) => [
      op,
      t,
      t,
      t,
    ]),
  ]),
  // The operator is add (+), subtract (-), or divide (/), and the operands are matrices with the same
  // number of rows and the same number of columns.  In this case, the operation is done component-
  // wise resulting in the same size matrix.
  ...[TOKEN.PLUS, TOKEN.DASH, TOKEN.SLASH].flatMap<BinOp>((op) =>
    MATRIX_TYPES.map<BinOp>((t) => [op, t, t, t]),
  ),
  // MAT_COLS_X_ROWS
  // columns of lhs === rows of rhs
  [TOKEN.STAR, TOKEN.VEC2, TOKEN.MAT2X2, TOKEN.VEC2],
  [TOKEN.STAR, TOKEN.VEC3, TOKEN.MAT2X3, TOKEN.VEC2],
  [TOKEN.STAR, TOKEN.VEC4, TOKEN.MAT2X4, TOKEN.VEC2],

  [TOKEN.STAR, TOKEN.VEC2, TOKEN.MAT3X2, TOKEN.VEC3],
  [TOKEN.STAR, TOKEN.VEC3, TOKEN.MAT3X3, TOKEN.VEC3],
  [TOKEN.STAR, TOKEN.VEC4, TOKEN.MAT3X4, TOKEN.VEC3],

  [TOKEN.STAR, TOKEN.VEC2, TOKEN.MAT4X2, TOKEN.VEC4],
  [TOKEN.STAR, TOKEN.VEC3, TOKEN.MAT4X3, TOKEN.VEC4],
  [TOKEN.STAR, TOKEN.VEC4, TOKEN.MAT4X4, TOKEN.VEC4],

  [TOKEN.STAR, TOKEN.MAT2X2, TOKEN.VEC2, TOKEN.VEC2],
  [TOKEN.STAR, TOKEN.MAT3X2, TOKEN.VEC3, TOKEN.VEC2],
  [TOKEN.STAR, TOKEN.MAT4X2, TOKEN.VEC4, TOKEN.VEC2],

  [TOKEN.STAR, TOKEN.MAT2X3, TOKEN.VEC2, TOKEN.VEC3],
  [TOKEN.STAR, TOKEN.MAT3X3, TOKEN.VEC3, TOKEN.VEC3],
  [TOKEN.STAR, TOKEN.MAT4X3, TOKEN.VEC4, TOKEN.VEC3],

  [TOKEN.STAR, TOKEN.MAT2X4, TOKEN.VEC2, TOKEN.VEC4],
  [TOKEN.STAR, TOKEN.MAT3X4, TOKEN.VEC3, TOKEN.VEC4],
  [TOKEN.STAR, TOKEN.MAT4X4, TOKEN.VEC4, TOKEN.VEC4],

  [TOKEN.STAR, TOKEN.MAT2X2, TOKEN.MAT2X2, TOKEN.MAT2X2],
  [TOKEN.STAR, TOKEN.MAT2X2, TOKEN.MAT3X2, TOKEN.MAT2X3],
  [TOKEN.STAR, TOKEN.MAT2X2, TOKEN.MAT4X2, TOKEN.MAT2X4],
  [TOKEN.STAR, TOKEN.MAT2X3, TOKEN.MAT2X2, TOKEN.MAT3X2],
  [TOKEN.STAR, TOKEN.MAT2X3, TOKEN.MAT3X2, TOKEN.MAT3X3],
  [TOKEN.STAR, TOKEN.MAT2X3, TOKEN.MAT4X2, TOKEN.MAT3X4],
  [TOKEN.STAR, TOKEN.MAT2X4, TOKEN.MAT2X2, TOKEN.MAT4X2],
  [TOKEN.STAR, TOKEN.MAT2X4, TOKEN.MAT3X2, TOKEN.MAT4X3],
  [TOKEN.STAR, TOKEN.MAT2X4, TOKEN.MAT4X2, TOKEN.MAT4X4],

  [TOKEN.STAR, TOKEN.MAT3X2, TOKEN.MAT2X3, TOKEN.MAT2X2],
  [TOKEN.STAR, TOKEN.MAT3X2, TOKEN.MAT3X3, TOKEN.MAT2X3],
  [TOKEN.STAR, TOKEN.MAT3X2, TOKEN.MAT4X3, TOKEN.MAT2X4],
  [TOKEN.STAR, TOKEN.MAT3X3, TOKEN.MAT2X3, TOKEN.MAT3X2],
  [TOKEN.STAR, TOKEN.MAT3X3, TOKEN.MAT3X3, TOKEN.MAT3X3],
  [TOKEN.STAR, TOKEN.MAT3X3, TOKEN.MAT4X3, TOKEN.MAT3X4],
  [TOKEN.STAR, TOKEN.MAT3X4, TOKEN.MAT2X3, TOKEN.MAT4X2],
  [TOKEN.STAR, TOKEN.MAT3X4, TOKEN.MAT3X3, TOKEN.MAT4X3],
  [TOKEN.STAR, TOKEN.MAT3X4, TOKEN.MAT4X3, TOKEN.MAT4X4],

  [TOKEN.STAR, TOKEN.MAT4X2, TOKEN.MAT2X4, TOKEN.MAT2X2],
  [TOKEN.STAR, TOKEN.MAT4X2, TOKEN.MAT3X4, TOKEN.MAT2X3],
  [TOKEN.STAR, TOKEN.MAT4X2, TOKEN.MAT4X4, TOKEN.MAT2X4],
  [TOKEN.STAR, TOKEN.MAT4X3, TOKEN.MAT2X4, TOKEN.MAT3X2],
  [TOKEN.STAR, TOKEN.MAT4X3, TOKEN.MAT3X4, TOKEN.MAT3X3],
  [TOKEN.STAR, TOKEN.MAT4X3, TOKEN.MAT4X4, TOKEN.MAT3X4],
  [TOKEN.STAR, TOKEN.MAT4X4, TOKEN.MAT2X4, TOKEN.MAT4X2],
  [TOKEN.STAR, TOKEN.MAT4X4, TOKEN.MAT3X4, TOKEN.MAT4X3],
  [TOKEN.STAR, TOKEN.MAT4X4, TOKEN.MAT4X4, TOKEN.MAT4X4],

  // The operator modulus (%)  operates on signed or unsigned integers or integer vectors.  The operand
  // types must both be signed or both be unsigned.  The operands cannot be vectors of differing size.  If
  // one operand is a scalar and the other vector, then the scalar is applied component-wise to the vector,
  // resulting in the same type as the vector.  If both are vectors of the same size, the result is computed
  // component-wise. [...] The operator modulus (%) is not defined for any other data
  // types (non-integral types).
  // The bitwise operators and (&), exclusive-or (^), and inclusive-or (|).  The operands must be of type
  // signed or unsigned integers or integer vectors.  The operands cannot be vectors of differing size.  If
  // one operand is a scalar and the other a vector, the scalar is applied component-wise to the vector,
  // resulting in the same type as the vector.  The fundamental types of the operands (signed or unsigned)
  // must match, and will be the resulting fundamental type. [...]
  ...[
    TOKEN.PERCENT,
    TOKEN.AMPERSAND,
    TOKEN.CARET,
    TOKEN.VERTICAL_BAR,
  ].flatMap<BinOp>((op) => [
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    ...UVEC_TYPES.flatMap<BinOp>((t) => [
      [op, TOKEN.UINT, t, t],
      [op, t, TOKEN.UINT, t],
      [op, t, t, t],
    ]),
    ...IVEC_TYPES.flatMap<BinOp>((t) => [
      [op, TOKEN.INT, t, t],
      [op, t, TOKEN.INT, t],
      [op, t, t, t],
    ]),
  ]),
  // TODO: add hints for lessThan, greaterThan, etc
  ...[
    TOKEN.LE_OP,
    TOKEN.GE_OP,
    TOKEN.LEFT_ANGLE,
    TOKEN.RIGHT_ANGLE,
  ].flatMap<BinOp>((op) => [
    [op, TOKEN.FLOAT, TOKEN.FLOAT, TOKEN.BOOL],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.BOOL],
    [op, TOKEN.INT, TOKEN.INT, TOKEN.BOOL],
  ]),
  [TOKEN.AND_OP, TOKEN.BOOL, TOKEN.BOOL, TOKEN.BOOL],
  [TOKEN.OR_OP, TOKEN.BOOL, TOKEN.BOOL, TOKEN.BOOL],
  [TOKEN.XOR_OP, TOKEN.BOOL, TOKEN.BOOL, TOKEN.BOOL],

  // The shift operators (<<) and (>>).  For both operators, the operands must be signed or unsigned
  // integers or integer vectors.  One operand can be signed while the other is unsigned.  In all cases, the
  // resulting type will be the same type as the left operand.  If the first operand is a scalar, the second
  // operand has to be a scalar as well.  If the first operand is a vector, the second operand must be a scalar
  // or a vector with the same size as the first operand, and the result is computed component-wise. [...]
  ...[TOKEN.LEFT_OP, TOKEN.RIGHT_OP].flatMap<BinOp>((op) => [
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [op, TOKEN.INT, TOKEN.UINT, TOKEN.INT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    [op, TOKEN.UINT, TOKEN.INT, TOKEN.UINT],
    ...[...UVEC_TYPES, ...IVEC_TYPES].flatMap<BinOp>((t, i) => [
      [op, t, TOKEN.INT, t],
      [op, t, TOKEN.UINT, t],
      [op, t, UVEC_TYPES[i % 3], t],
      [op, t, IVEC_TYPES[i % 3], t],
    ]),
  ]),
]
// console.table(VALID_BINARY_OPERATIONS.map((x) => x.map((y) => y.PATTERN)))
// console.log("VALID_BINARY_OPERATIONS.length", VALID_BINARY_OPERATIONS.length)

function typesEquals(as: NormalizedType[], bs: NormalizedType[]): boolean {
  return as.length === bs.length && as.every((a, i) => typeEquals(a, bs[i]))
}

function isOpaqueType(tokenType: TokenType): boolean {
  return [
    TOKEN.USAMPLERCUBE,
    TOKEN.USAMPLER3D,
    TOKEN.USAMPLER2DARRAY,
    TOKEN.USAMPLER2D,
    TOKEN.SAMPLERCUBESHADOW,
    TOKEN.SAMPLERCUBE,
    TOKEN.SAMPLER3D,
    TOKEN.SAMPLER2DSHADOW,
    TOKEN.SAMPLER2DARRAYSHADOW,
    TOKEN.SAMPLER2DARRAY,
    TOKEN.SAMPLER2D,
    TOKEN.ISAMPLERCUBE,
    TOKEN.ISAMPLER3D,
    TOKEN.ISAMPLER2DARRAY,
    TOKEN.ISAMPLER2D,
  ].includes(tokenType)
}

class CheckerVisitor extends AbstractVisitor<NormalizedType> {
  private currentFunctionPrototypeReturnType: NormalizedType | undefined =
    undefined
  private shaderType: ShaderType | undefined = undefined

  private isGlobal = true

  public check(
    u: Node | undefined,
    shaderType: ShaderType | undefined,
  ): NormalizedType | undefined {
    this.shaderType = shaderType
    return super.visit(u)
  }

  protected visit(n: Node | undefined): NormalizedType | undefined {
    const resolvedType = super.visit(n)
    if (n && isExpression(n)) {
      n.resolvedType = resolvedType
    }
    return resolvedType
  }

  protected uniformBlock(n: UniformBlock): NormalizedType | undefined {
    for (const declaration of n.declarations) {
      const ts = declaration.fsType.typeSpecifier
      if (isToken(ts.typeSpecifierNonArray)) {
        if (isOpaqueType(ts.typeSpecifierNonArray.tokenType)) {
          markError(
            ts.typeSpecifierNonArray,
            "opaque type is not allowed in uniform block",
          )
        }
      } else {
        markError(ts, "struct definition is not allowed in uniform block")
      }
      const storageQualifier =
        declaration.fsType.typeQualifier?.storageQualifier
      if (
        storageQualifier &&
        (storageQualifier.CENTROID ||
          storageQualifier.IN ||
          storageQualifier.OUT ||
          storageQualifier.CONST)
      ) {
        markError(
          storageQualifier,
          "only the (redundant) qualifier uniform is allowed in a uniform block",
        )
      }
    }
    return super.uniformBlock(n)
  }

  protected structSpecifier(n: StructSpecifier): NormalizedType | undefined {
    if (!n.declarations.length) {
      markError(n, "struct specifiers need at least one member")
    }
    return super.structSpecifier(n)
  }

  protected initDeclaratorListDeclaration(
    n: InitDeclaratorListDeclaration,
  ): NormalizedType | undefined {
    const storageQualifier = n.fsType.typeQualifier?.storageQualifier
    for (const declarator of n.declarators) {
      if (storageQualifier?.CONST && !declarator.init) {
        markError(declarator, "S0031")
      }
    }
    if (this.isGlobal) {
      if (this.shaderType === "fragment") {
        if (storageQualifier?.CENTROID && storageQualifier.OUT) {
          markError(
            storageQualifier,
            "centroid out is not allowed in fragment shaders",
          )
        }
        if (storageQualifier?.OUT) {
          const ts = n.fsType.typeSpecifier.typeSpecifierNonArray
          if (isToken(ts)) {
            if (isOpaqueType(ts.tokenType)) {
              markError(
                ts,
                "opaque types are not allowed as fragment shader outputs",
              )
            } else if (getMatrixDimensions(ts.tokenType)) {
              markError(
                ts,
                "matrix types are not allowed as fragment shader outputs",
              )
            } else if (ts.tokenType === TOKEN.BOOL) {
              markError(
                ts,
                "boolean types are not allowed as fragment shader outputs",
              )
            }
          } else {
            markError(
              ts,
              "struct definitions are not allowed as fragment shader outputs",
            )
          }
        }
      }
      if (n.fsType.typeQualifier?.invariantQualifier && storageQualifier?.IN) {
        markError(
          n.fsType.typeQualifier?.invariantQualifier,
          "S0034",
          "in variable cannot be declared as invariant",
        )
      }
    } else {
      if (n.fsType.typeQualifier?.invariantQualifier) {
        markError(n.fsType.typeQualifier?.invariantQualifier, "S0035")
      }
      if (storageQualifier?.IN) {
        markError(
          storageQualifier.IN,
          "in qualifier only allowed at global scope",
        )
      }
      if (storageQualifier?.OUT) {
        markError(
          storageQualifier.OUT,
          "out qualifier only allowed at global scope",
        )
      }
      if (storageQualifier?.CENTROID) {
        markError(
          storageQualifier.CENTROID,
          "centroid qualifier only allowed at global scope",
        )
      }
      if (storageQualifier?.UNIFORM) {
        markError(
          storageQualifier.UNIFORM,
          "uniform qualifier only allowed at global scope",
        )
      }
    }
    return super.initDeclaratorListDeclaration(n)
  }

  protected binaryExpression(n: BinaryExpression): NormalizedType | undefined {
    const lType = this.visit(n.lhs)
    const rType = this.visit(n.rhs)

    function markErr(n: BinaryExpression) {
      markError(
        n.op,
        "S0004",
        "TODO lhs op rhs",
        "valid ops for " +
          n.op.tokenType.PATTERN +
          " are\n" +
          VALID_BINARY_OPERATIONS.filter(([op]) => op === n.op.tokenType)
            .map(
              ([op, lhs, rhs]) =>
                `  ${lhs.LABEL ?? lhs.PATTERN} ${op.PATTERN} ${
                  rhs.LABEL ?? rhs.PATTERN
                }`,
            )
            .join("\n"),
      )
    }

    if (lType?.kind === "basic" && rType?.kind === "basic") {
      const validOp = VALID_BINARY_OPERATIONS.find(
        ([op, lhs, rhs, _result]) =>
          op === n.op.tokenType && lhs === lType.type && rhs === rType.type,
      )
      if (validOp) {
        return { kind: "basic", type: validOp[3] }
      } else {
        markErr(n)
      }
    } else if (lType && rType) {
      markErr(n)
    }
    return
  }

  protected assignmentExpression(
    n: AssignmentExpression,
  ): NormalizedType | undefined {
    // We parse conditionExpressions on the LHS, but only unaryExpressions are allowed.

    if (!isLValue(n.lhs)) {
      markError(n.lhs, "S0027")
    }

    const lType = this.visit(n.lhs)
    const rType = this.visit(n.rhs)
    if (n.op.tokenType === TOKEN.EQUAL) {
      if (typeNotEquals(lType, rType)) {
        // TODO better error code?
        markError(n.op, "S0004", lType, rType)
      }
    } else if (lType?.kind === "basic" && rType?.kind === "basic") {
      const binaryOp = getAssignOpBinaryOp(n.op.tokenType)
      const validOp = VALID_BINARY_OPERATIONS.find(
        ([op, lhs, rhs, _result]) =>
          op === binaryOp && lhs === lType.type && rhs === rType.type,
      )
      if (validOp) {
        return { kind: "basic", type: validOp[3] }
      } else {
        markError(n.op, "S0004", "TODO lhs op rhs")
      }
    } else if (lType && rType) {
      markError(n.op, "S0004", "TODO lhs op rhs")
    }
    return lType
  }

  protected selectionStatement(
    n: SelectionStatement,
  ): NormalizedType | undefined {
    const cType = this.visit(n.condition)
    this.visit(n.yes)
    this.visit(n.no)
    if (typeNotEquals(cType, BasicType.BOOL)) {
      markError(n.condition, "S0003")
    }
    return
  }

  protected forStatement(n: ForStatement): NormalizedType | undefined {
    this.visit(n.initExpression)
    if (n.conditionExpression) {
      const cType = this.visit(n.conditionExpression)
      if (typeNotEquals(cType, BasicType.BOOL)) {
        markError(n.conditionExpression, "S0003")
      }
    }
    this.visit(n.loopExpression)
    this.visit(n.statement)
    return
  }

  protected whileStatement(n: WhileStatement): NormalizedType | undefined {
    const cType = this.visit(n.conditionExpression)
    this.visit(n.statement)
    if (typeNotEquals(cType, BasicType.BOOL)) {
      markError(n.conditionExpression, "S0003")
    }
    return
  }

  protected doWhileStatement(n: DoWhileStatement): NormalizedType | undefined {
    this.visit(n.statement)
    const cType = this.visit(n.conditionExpression)
    if (typeNotEquals(cType, BasicType.BOOL)) {
      markError(n.conditionExpression, "S0003")
    }
    return
  }

  protected switchStatement(n: SwitchStatement): NormalizedType | undefined {
    const iType = this.visit(n.initExpression)
    if (
      typeNotEquals(iType, BasicType.INT) &&
      typeNotEquals(iType, BasicType.UINT)
    ) {
      markError(n.initExpression, "S0057")
    }
    this.visit(n.body)
    return super.switchStatement(n)
  }

  protected arrayAccess(n: ArrayAccess): NormalizedType | undefined {
    const iType = this.visit(n.index)
    if (
      typeNotEquals(iType, BasicType.INT) &&
      typeNotEquals(iType, BasicType.UINT)
    ) {
      markError(n.index, "S0002")
    }

    const oType = this.visit(n.on)
    if (oType?.kind === "array") {
      // array access
      const cnst = evaluateConstantExpression(n.index)
      if (this.shaderType === "fragment") {
        const isShaderOutputVariable =
          n.on.kind === "variableExpression" &&
          n.on.binding &&
          n.on.binding?.declaratorList?.fsType.typeQualifier?.storageQualifier
            ?.OUT
        if (isShaderOutputVariable && !cnst) {
          markError(
            n.index,
            "fragment shader outputs declared as array may only be indexed by a constant",
          )
        }
      }
      if (cnst) {
        if (oType.size && cnst.value >= oType.size) {
          markError(n.index, "S0020")
        }
        if (cnst.value < 0) {
          markError(n.index, "S0021")
        }
      }
      return oType.of
      // TODO: if constant expression, check array access size
    } else if (oType?.kind === "basic") {
      const vecElem = getVectorElementType(oType.type)
      const mDim = getMatrixDimensions(oType.type)
      if (vecElem) {
        return { kind: "basic", type: vecElem }
      } else if (mDim) {
        // return column
        const [, mRows] = mDim
        return BasicType(getVectorType(TOKEN.FLOAT, mRows))
      }
    }
  }

  protected variableExpression(
    n: VariableExpression,
  ): NormalizedType | undefined {
    const binding: VariableBinding | undefined = n.binding

    return binding?.type
  }

  protected fieldAccess(n: FieldAccess): NormalizedType | undefined {
    const oType = this.visit(n.on)
    if (isVectorType(oType)) {
      const f = n.field.image
      if (/^[xyzwrgbastpq]+$/.test(f)) {
        // treat as field swizzle
        if (!/^([xyzw]+|[rgba]+|[stpq]+)$/.test(f)) {
          markError(n.field, "S0025")
        } else if (f.length > 4) {
          markError(n.field, "S0026", "Swizzle can select at most 4 fields.")
        } else {
          const vectorSize = getVectorSize(oType.type)
          for (let i = 0; i < f.length; i++) {
            // eg "r" => 0, "z" => 3
            const vectorFieldIndex = "xyzwrgbastpq".indexOf(f[i]) % 4
            if (vectorFieldIndex >= vectorSize) {
              markError(
                n.field,
                "S0026",
                "" + f[i] + " cannot be used on ",
                oType,
              )
            }
          }
        }

        return BasicType(
          getVectorType(getVectorElementType(oType.type)!, f.length),
        )
      }
    } else if (oType?.kind === "struct") {
      const f = n.field.image
      const field = oType.fields[f]
      if (field) {
        return field.type
      } else {
        markError(
          n.field,
          "S0026",
          `field ${f} is not defined on type ${typeString(oType)}`,
        )
      }
    } else if (oType) {
      markError(
        n.field,
        "S0026",
        "field access cannot be used on " + typeString(oType),
      )
    }
  }

  protected postfixExpression(
    n: PostfixExpression,
  ): NormalizedType | undefined {
    if (n.op.tokenType === TOKEN.INC_OP || n.op.tokenType === TOKEN.DEC_OP) {
      if (!isLValue(n.on)) {
        markError(n.on, "S0027")
      }
    }
    return this.visit(n.on)
  }

  protected unaryExpression(n: UnaryExpression): NormalizedType | undefined {
    // The arithmetic unary operators negate (-), post- and pre-increment and decrement (-- and ++) operate
    // on integer or floating-point values (including vectors and matrices).  All unary operators work
    // component-wise on their operands.  These result with the same type they operated on.  For post- and
    // pre-increment and decrement, the expression must be one that could be assigned to (an l-value).

    if (n.op.tokenType === TOKEN.INC_OP || n.op.tokenType === TOKEN.DEC_OP) {
      if (!isLValue(n.on)) {
        markError(n.on, "S0027")
      }
    }

    const oType = this.visit(n.on)
    if (!oType) {
      return
    }
    switch (n.op.tokenType) {
      case TOKEN.DEC_OP:
      case TOKEN.INC_OP:
      case TOKEN.DASH:
        if (
          oType?.kind === "basic" &&
          (TOKEN.INT === oType.type ||
            TOKEN.UINT === oType.type ||
            TOKEN.FLOAT === oType.type ||
            VEC_TYPES.includes(oType.type) ||
            UVEC_TYPES.includes(oType.type) ||
            IVEC_TYPES.includes(oType.type) ||
            MATRIX_TYPES.includes(oType.type))
        ) {
          return oType
        } else {
          markError(
            n,
            "S0004",
            `Valid operand types for ${n.op.tokenType} are integer, float, vector or matrix types, not `,
            oType,
          )
          return
        }
      case TOKEN.BANG:
        if (typeNotEquals(oType, BasicType.BOOL)) {
          markError(
            n,
            "S0004",
            "Unary operator for ! is only applicable to bool.",
          )
        }
        return BasicType.BOOL
      case TOKEN.TILDE:
        if (
          oType?.kind === "basic" &&
          (TOKEN.INT === oType.type ||
            TOKEN.UINT === oType.type ||
            UVEC_TYPES.includes(oType.type) ||
            IVEC_TYPES.includes(oType.type))
        ) {
          return oType
        } else {
          markError(
            n,
            "S0004",
            `Valid operand types for ${n.op.tokenType} are integer scalars or vectors `,
            oType,
          )
        }
    }
  }

  protected conditionalExpression(
    n: ConditionalExpression,
  ): NormalizedType | undefined {
    const cType = this.visit(n.condition)
    const yType = this.visit(n.yes)
    const nType = this.visit(n.no)

    if (typeNotEquals(cType, BasicType.BOOL)) {
      markError(n.condition, "S0005", typeString(cType))
    }
    if (typeNotEquals(yType, nType)) {
      markError(n, "S0006", yType, nType)
    }
    return yType
  }

  protected returnStatement(n: ReturnStatement): NormalizedType | undefined {
    // if (!this.currentFunctionPrototypeReturnType) {
    //   throw new Error()
    // }
    const wType = this.visit(n.what)
    if (typeEquals(this.currentFunctionPrototypeReturnType, BasicType.VOID)) {
      if (n.what) {
        markError(n.what, "S0039")
      }
    } else {
      if (!n.what) {
        markError(n, "S0038")
      } else {
        if (typeNotEquals(wType, this.currentFunctionPrototypeReturnType)) {
          markError(n.what, "S0042")
        }
      }
    }
    return super.returnStatement(n)
  }

  protected functionPrototype(
    n: FunctionPrototype,
  ): NormalizedType | undefined {
    this.currentFunctionPrototypeReturnType = undefined
    super.functionPrototype(n)
    this.currentFunctionPrototypeReturnType = undefined
    return
  }

  protected functionDefinition(
    n: FunctionDefinition,
  ): NormalizedType | undefined {
    if (this.currentFunctionPrototypeReturnType) {
      throw new Error()
    }
    this.currentFunctionPrototypeReturnType = n.returnTypeResolved
    this.isGlobal = false
    super.functionDefinition(n)
    this.currentFunctionPrototypeReturnType = undefined
    this.isGlobal = true
    return
  }

  protected functionCall(n: FunctionCall): NormalizedType | undefined {
    const aTypes: (NormalizedType | undefined)[] = n.args.map((a) =>
      this.visit(a),
    )
    if (n.binding) {
      // function call
      if (allDefined(aTypes)) {
        const overload = findMatchingFunctionDefinition(aTypes, n.binding)
        if (overload) {
          return overload.result
        } else {
          markError(n, "no matching overload for params", aTypes)
        }
      }
    } else if (n.constructorType) {
      if (n.constructorType.kind === "struct") {
        if (allDefined(aTypes)) {
          const expectedArgs: (NormalizedType | undefined)[] = Object.values(
            n.constructorType.fields,
          ).map((f) => f.type)
          if (allDefined(expectedArgs) && !typesEquals(aTypes, expectedArgs)) {
            markError(n, "S0007", `expected ${expectedArgs} but was ${aTypes}`)
          }
        }
      } else if (n.constructorType.kind === "basic") {
        // BASIC_TYPE(args)

        const basicType = n.constructorType.type
        const fillVectorOrMatrixConstructor = (needed: number): void => {
          let provided = 0
          for (let i = 0; i < aTypes.length; i++) {
            if (provided >= needed) {
              markError(
                n.args[i],
                "S0008",
                "Too many arguments. Need ",
                needed + " components, already have ",
                provided,
              )
            } else {
              const aType = aTypes[i]
              if (aType?.kind === "basic") {
                const aSize = getComponentCount(aType.type)
                if (!aSize) {
                  markError(
                    n.args[i],
                    "S0007",
                    "only scalar, vector and matrix types are allowed, but was",
                    aType,
                  )
                } else {
                  provided += aSize
                }
              } else {
                markError(
                  n.args[i],
                  "S0007",
                  "only scalar, vector and matrix types are allowed, but was",
                  aType,
                )
              }
            }
          }
          if (provided !== 1 && provided < needed) {
            markError(
              n.callee,
              "S0009",
              `Need ${needed} but only got ${provided}`,
            )
          }
        }

        if (getScalarType(basicType)) {
          if (
            aTypes[0] &&
            (aTypes[0].kind !== "basic" ||
              getComponentCount(aTypes[0].type) === 0)
          ) {
            markError(
              n.args[0],
              "S0007",
              "only scalar, vector and matrix types are allowed, but was",
              aTypes[0],
            )
          }
          for (let i = 1; i < n.args.length; i++) {
            markError(
              n.args[i],
              "S0008",
              "only one argument is allowed for a scalar constructor",
            )
          }
        } else if (getVectorSize(basicType)) {
          const needed = getVectorSize(basicType)
          fillVectorOrMatrixConstructor(needed)
        } else if (getMatrixDimensions(basicType)) {
          const matrixArg = aTypes.find((t) => isMatrixType(t))
          if (matrixArg) {
            for (let i = 0; i < n.args.length; i++) {
              if (aTypes[i] !== matrixArg) {
                markError(
                  n.args[i],
                  "S0007",
                  "if a matrix argument is given to a matrix constructor, it must be the only one",
                )
              }
            }
          } else {
            const needed = getComponentCount(basicType)!
            fillVectorOrMatrixConstructor(needed)
          }
        }
        return { kind: "basic", type: basicType }
      } else if (n.constructorType.kind === "array") {
        if (n.constructorType.size !== n.args.length) {
          markError(
            n.callee,
            "Wrong number of arguments, expected",
            n.constructorType.size,
            "but was ",
            n.args.length,
          )
        }
        for (let i = 0; i < n.args.length; i++) {
          if (typeNotEquals(aTypes[i], n.constructorType.of)) {
            markError(n.callee, "Types do not match")
          }
        }
      }
      return n.constructorType
    }
  }

  protected methodCall(n: MethodCall): NormalizedType | undefined {
    // there is only one method: array.length()

    const onType = this.visit(n.on)
    if (onType && onType.kind !== "array") {
      markError(n.on, "method call only valid on arrays")
    }

    if (!isToken(n.functionCall.callee.typeSpecifierNonArray)) {
      throw new Error()
    }
    if (n.functionCall.callee.typeSpecifierNonArray.image !== "length") {
      markError(n.functionCall.callee, "only method is .length()")
    }
    for (const a of n.functionCall.args) {
      markError(a, "No arguments to .length()")
    }
    return BasicType.INT
  }

  protected constantExpression(
    n: ConstantExpression,
  ): NormalizedType | undefined {
    const c = n.const_
    if (c.tokenType === TOKEN.INTCONSTANT) {
      const val = evaluateConstantExpression(n)!.value
      if (val > 0xffff_ffff) {
        markError(c, "G0005")
      }
    }

    return { kind: "basic", type: getConstantType(c.tokenType) }
  }
}

const BINDER_VISITOR = new BinderVisitor()
const CHECKER_VISITOR = new CheckerVisitor()

function loadBuiltins() {
  const builtinsSrc = readFileSync(
    path.join(__dirname, "..", "builtins.glsl"),
    { encoding: "utf8" },
  )
  const u = parseInput(builtinsSrc)
  BINDER_VISITOR.builtins(u)
}

loadBuiltins()

export function check(
  u: TranslationUnit,
  shaderType: ShaderType | undefined,
): CheckError[] {
  const result = errors
  BINDER_VISITOR.bind(u)
  CHECKER_VISITOR.check(u, shaderType)
  errors = []
  return result
}
