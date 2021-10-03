import { isEqualWith, last, pick } from "lodash"
import { TokenType } from "chevrotain"
import "colors"

import {
  AbstractVisitor,
  ArrayAccess,
  ArraySpecifier,
  AssignmentExpression,
  BaseNode,
  BinaryExpression,
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
  Node,
  ParameterDeclaration,
  ReturnStatement,
  SelectionStatement,
  StructSpecifier,
  SwitchStatement,
  Token,
  TranslationUnit,
  TypeSpecifier,
  UnaryExpression,
  VariableExpression,
  WhileStatement,
} from "./nodes"
import { TOKEN } from "./lexer"

type BasicType = Readonly<{ kind: "basic"; type: TokenType }>
type ArrayType = Readonly<{
  kind: "array"
  of: NormalizedType | undefined
  size: number
}>
type StructType = Readonly<{
  specifier: StructSpecifier
  kind: "struct"
  fields: {
    [name: string]: {
      type: NormalizedType | undefined
      declarator: Declarator
    }
  }
}>

function isVectorType(n: NormalizedType | undefined): n is BasicType {
  return n?.kind === "basic" && getVectorSize(n.type) !== 0
}

type NormalizedType = BasicType | ArrayType | StructType

function NormalizedType(type?: TokenType): NormalizedType | undefined {
  return type && { kind: "basic", type }
}

namespace NormalizedType {
  export const FLOAT: NormalizedType = { kind: "basic", type: TOKEN.FLOAT }
  export const BOOL: NormalizedType = { kind: "basic", type: TOKEN.BOOL }
  export const VOID: NormalizedType = { kind: "basic", type: TOKEN.VOID }
  export const INT: NormalizedType = { kind: "basic", type: TOKEN.INT }
  export const UINT: NormalizedType = { kind: "basic", type: TOKEN.UINT }
}

export type Error = { where: Token | Node; err: string }
let errors: Error[] = []

function markError(
  where: Token | Node,
  err: string,
  ...args: (NormalizedType[] | NormalizedType | string | number | undefined)[]
) {
  errors.push({ where, err })
}

function isLValue(l: Node): boolean {
  if (l.type === "variableExpression") {
    return true
  }
  if (l.type === "fieldAccess") {
    return isLValue(l.on)
  }
  if (l.type === "arrayAccess") {
    return isLValue(l.on)
  }
  // if (l.type === "parenExpression")
  return false
}

function isConstructorCall(b: FunctionCall): boolean {
  return b.what.type === "typeSpecifier"
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

function evaluateBinaryOp(
  op: Token,
  a: any,
  b: any,
  aType: TokenType,
): { type: NormalizedType; value: any } {
  function doOp(op: Token, a: any, b: any) {
    switch (op.tokenType) {
      case TOKEN.PLUS:
        return a + b
      case TOKEN.DASH:
        return a - b

      case TOKEN.STAR:
        return a * b
      case TOKEN.PERCENT:
        return a % b
      case TOKEN.SLASH:
        return a / b

      case TOKEN.LEFT_OP:
        return a << b
      case TOKEN.RIGHT_OP:
        return a >> b

      case TOKEN.EQ_OP:
        return a === b
      case TOKEN.NE_OP:
        return a !== b
      case TOKEN.LE_OP:
        return a <= b
      case TOKEN.GE_OP:
        return a >= b
      case TOKEN.LEFT_ANGLE:
        return a < b
      case TOKEN.RIGHT_ANGLE:
        return a > b

      case TOKEN.XOR_OP:
        return a !== b
      case TOKEN.AND_OP:
        return a && b
      case TOKEN.OR_OP:
        return a || b

      case TOKEN.AMPERSAND:
        return a & b
      case TOKEN.CARET:
        return a ^ b
      case TOKEN.VERTICAL_BAR:
        return a | b
      default:
        throw new Error()
    }
  }

  const value = doOp(op, a, b)
  if (typeof value === "boolean") {
    return {
      type: NormalizedType.BOOL,
      value: value,
    }
  } else if (aType === TOKEN.FLOAT) {
    return {
      type: NormalizedType.FLOAT,
      value: Math.fround(value as number),
    }
  } else if (aType === TOKEN.INT) {
    return {
      type: NormalizedType.INT,
      value: value | 0,
    }
  } else if (aType === TOKEN.UINT) {
    return {
      type: NormalizedType.INT,
      value: mod(value, 0x1_0000_0000),
    }
  } else {
    throw new Error()
  }
}

function mod(x: number, a: number) {
  return ((x % a) + a) % a
}

function norm(value: number | boolean, type: TokenType) {
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

export function evaluateConstantExpression(n: Node):
  | {
      type: NormalizedType
      value: any
    }
  | undefined {
  function evalIntConstant(s: string) {
    return s.length >= 2 && s[0] === "0" && s[1] !== "x"
      ? parseInt(s, 8)
      : Number(s)
  }

  switch (n.type) {
    case "constantExpression":
      switch (n._const.tokenType) {
        case TOKEN.FLOATCONSTANT:
          return {
            type: NormalizedType.FLOAT,
            value: +n._const.image,
          }
        case TOKEN.BOOLCONSTANT:
          return {
            type: NormalizedType.BOOL,
            value: n._const.image === "true",
          }
        case TOKEN.INTCONSTANT:
          return {
            type: NormalizedType.INT,
            value: evalIntConstant(n._const.image),
          }
        case TOKEN.UINTCONSTANT:
          return {
            type: NormalizedType.UINT,
            value: evalIntConstant(
              n._const.image.substring(0, n._const.image.length - 1),
            ),
          }
        default:
          throw new Error()
      }
    case "unaryExpression": {
      const on = evaluateConstantExpression(n.on)
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
            return norm(~on, t)
          case TOKEN.BANG:
            return norm(!on, t)
          case TOKEN.DASH:
            return norm(-on, t)
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
    case "binaryExpression": {
      const l = evaluateConstantExpression(n.lhs)
      const r = evaluateConstantExpression(n.rhs)
      if (!l || !r) {
        return undefined
      }
      if (l.type.kind === "basic" && getScalarType(l.type.type)) {
        if (typesNotEqual(l.type, l.type)) {
          throw new Error("types don't match")
        } else {
          const lv = l.value
          const rv = r.value
          return evaluateBinaryOp(n.op, lv, rv, l.type.type)
        }
      } else if (isVectorType(l.type)) {
        const vectorSize = getVectorSize(l.type.type)
        if (isVectorType(r.type)) {
          // two vectors
          return {
            type: l.type,
            value: (l.value as any[]).map((lv, i) =>
              evaluateBinaryOp(n.op, lv, r.value[i], (<BasicType>l.type).type),
            ),
          }
        } else {
          // vector + scalar
          return {
            type: l.type,
            value: (l.value as any[]).map((lv, i) =>
              evaluateBinaryOp(n.op, lv, r, l.type.type as TokenType),
            ),
          }
        }
      } else {
        throw new Error("???")
      }
    }
    case "arrayAccess":
      {
        const on = evaluateConstantExpression(n.on)
        if (!on) {
          return undefined
        }
        const index = evaluateConstantExpression(n.index)
        if (!index) {
          return undefined
        }
        const value1 = index.value as number
        if (on.type.kind === "array") {
          const ofType = on.type.of
          return (
            index &&
            ofType && { type: ofType, value: (on.value as any[])[value1] }
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
              value: (on.value as any[]).slice(
                value1 * rows,
                (value1 + 1) * rows,
              ),
            }
          }
        }
      }
      throw new Error()

    case "functionCall": {
      const args = n.args.map(evaluateConstantExpression)
      if (!allDefined(args)) {
        return undefined
      }
      if (n.binding) {
        // function call
      } else {
        // constructor

        const cType = n.constructorType!
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
            .map((e) => norm(e, neededType))
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
          return {
            type: { kind: "basic", type: cType.type },
            value: neededSize === 1 ? result[0] : result,
          }
        }
      }
      throw new Error()
    }
    case "commaExpression":
      return undefined
    case "methodCall": {
      const on = evaluateConstantExpression(n.on)
      if (on && on.type.kind === "array") {
        return { type: NormalizedType.INT, value: on.type.size }
      }
      return undefined
    }
    case "variableExpression":
      return (
        n.binding?.dl?.fsType.typeQualifier.storageQualifier?.CONST &&
        n.binding.d?.init &&
        evaluateConstantExpression(n.binding.d?.init)
      )
    default:
      throw new Error("???")
  }
}

function isConstantExpression(n: Node): boolean {
  function isBuiltInFunctionCall(n: FunctionCall): boolean {
    // TODO
    return n.what.type === "typeSpecifier"
  }

  // a constant expression is one of
  switch (n.type) {
    // a literal value (e.g. 5 or true)
    case "constantExpression":
      return true

    // a global or local variable qualified as const (i.e., not including function parameters)
    case "variableExpression": {
      const binding: VariableBinding | undefined = n.binding
      return !!binding?.dl?.fsType.typeQualifier.storageQualifier?.CONST
    }

    // an expression formed by an operator on operands that are all constant expressions, including getting an
    // element of a constant array, or a field of a constant structure, or components of a constant vector.
    // However, the sequence operator ( , ) and the assignment operators ( =, +=, ...)  are not included in the
    // operators that can create a constant expression
    case "binaryExpression":
      return isConstantExpression(n.lhs) && isConstantExpression(n.rhs)
    case "unaryExpression":
    case "postfixExpression":
      return isConstantExpression(n.on)

    // the length() methode on an array, whether or not the object itself is constant
    case "methodCall": {
      const what = n.functionCall.what
      return (
        what.arraySpecifier === undefined &&
        isToken(what.typeSpecifierNonArray) &&
        what.typeSpecifierNonArray.tokenType === TOKEN.IDENTIFIER &&
        what.typeSpecifierNonArray.image === "length"
      )
    }

    case "functionCall": {
      const ts = n.what.typeSpecifierNonArray as Token
      if (ts.tokenType === TOKEN.IDENTIFIER) {
        n.what.binding
      }
      return (
        (isConstructorCall(n) || isBuiltInFunctionCall(n)) &&
        n.args.every(isConstantExpression)
      )
    }
    default:
      return false
  }
}

interface FunctionBinding {
  kind: "function"
  overloads: {
    params: NormalizedType[]
    result: NormalizedType
    def: FunctionDefinition | FunctionPrototype
  }[]
}

interface StructBinding {
  kind: "struct"
  type: StructType
}

interface VariableBinding {
  kind: "variable"
  dl?: InitDeclaratorListDeclaration
  d?: Declarator
  pd?: ParameterDeclaration
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
}

interface Scope {
  parent: Scope | undefined
  defs: {
    [k: string]: Binding
  }
}

export function isToken(x: Token | Node): x is Token {
  return "tokenType" in x
}

function isTokenType(type: TokenType | StructSpecifier): type is TokenType {
  return typeof type.name === "string"
}

function assertNever(x?: never): never {
  throw new Error()
}

function assert(x: boolean): x is true {
  if (!x) {
    throw new Error()
  }
  return true
}

function typesEqual(
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
      return b.kind === "array" && a.size === b.size && typesEqual(a.of, b.of)
    case "struct":
      return b.kind === "struct" && a.specifier === b.specifier
    default:
      assertNever(a)
  }
}

function typesNotEqual(
  a: NormalizedType | undefined,
  b: NormalizedType | undefined,
): boolean {
  if (!a || !b) {
    return false
  }
  return !typesEqual(a, b)
}

function findMatchingFunctionDefinition(
  paramTypes: NormalizedType[],
  existingDef: FunctionBinding,
) {
  const overloads = existingDef.overloads
  for (const overload of overloads) {
    if (isEqualWith(overload, paramTypes, typesEqual)) {
      return overload
    }
  }
  return undefined
}

class BinderVisitor extends AbstractVisitor<any> {
  protected scopes: Scope[] = []
  private currentFunctionPrototypeParams:
    | (NormalizedType | undefined)[]
    | undefined = undefined

  protected get scope() {
    const s = last(this.scopes)
    if (!s) {
      throw new Error()
    }
    return s
  }

  structSpecifier(n: StructSpecifier): any {
    const fields: StructType["fields"] = {}
    for (const declaration of n.declarations) {
      declaration.type
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

  resolve(symbol: string): Binding | undefined {
    let scope: Scope | undefined = this.scope
    while (scope) {
      const x = scope.defs[symbol]
      if (x) {
        return x
      }
      scope = scope.parent
    }
  }

  variableExpression(n: VariableExpression) {
    const binding = this.resolve(n.var.image)
    if (binding) {
      n.binding = binding
    } else {
      markError(n, "G0002")
    }
  }

  public functionCall(n: FunctionCall): any {
    super.functionCall(n)
    const ts = n.what
    if (isToken(ts.typeSpecifierNonArray)) {
      if (
        ts.typeSpecifierNonArray.tokenType === TOKEN.IDENTIFIER &&
        !ts.arraySpecifier
      ) {
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
        ;(n.constructorType as any).size = n.args.length
      }
    } else {
      markError(ts, "structure definition cannot be constructor")
    }
  }

  initDeclaratorListDeclaration(n: InitDeclaratorListDeclaration) {
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
          dl: n,
          d,
          type: this.figure(n.fsType, d.arraySpecifier),
        }
      }
    }
  }

  translationUnit(n: TranslationUnit) {
    this.pushScope()
    super.translationUnit(n)
    this.popScope()
  }

  functionDefinition(n: FunctionDefinition) {
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
    this.visit(n.body)
    this.popScope()
    const existingDef = this.scope.defs[n.name.image]
    if (existingDef) {
      if (existingDef.kind !== "function") {
        markError(n, "S0024")
      } else if (allDefined(params)) {
        findMatchingFunctionDefinition(params, existingDef)
      }
    }
    n.returnTypeResolved = this.figure(n.returnType, undefined)
  }

  parameterDeclaration(n: ParameterDeclaration) {
    super.parameterDeclaration(n)

    const type = this.figure(n.typeSpecifier, n.arraySpecifier)
    this.currentFunctionPrototypeParams!.push(type)
    if (!isToken(n.typeSpecifier.typeSpecifierNonArray)) {
      markError(
        n.typeSpecifier.typeSpecifierNonArray,
        "no struct specifier as parameter type",
      )
    }
    if (n.pName) {
      const existingDef = this.scope.defs[n.pName.image]
      if (existingDef) {
        markError(n, "S0022")
      } else {
        this.scope.defs[n.pName.image] = { kind: "variable", pd: n, type }
      }
    }
  }

  compoundStatement(n: CompoundStatement) {
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
    if (typeSpecifier.type === "fullySpecifiedType") {
      typeSpecifier = typeSpecifier.typeSpecifier
    }
    const typeSpecifierNonArray = typeSpecifier.typeSpecifierNonArray
    if (isToken(typeSpecifierNonArray)) {
      let result: NormalizedType | undefined
      if (typeSpecifierNonArray.tokenType === TOKEN.IDENTIFIER) {
        // refers to a struct
        const binding = this.resolve(typeSpecifierNonArray.image)
        if (binding?.kind === "struct") {
          result = binding.type
        } else {
          // TODO markError
        }
      } else {
        result = { kind: "basic", type: typeSpecifierNonArray.tokenType }
      }
      for (const as of [typeSpecifier.arraySpecifier, arraySpecifier]) {
        if (as) {
          const size =
            as.size === undefined
              ? -1
              : +(evaluateConstantExpression(as.size)?.value ?? 0)
          result = { kind: "array", of: result, size }
        }
      }
      return result
    }
  }
}

function getMatrixDimensions(
  t: TokenType,
): [cols: number, rows: number] | undefined {
  switch (t) {
    case TOKEN.MAT2X2:
      return [2, 2]
    case TOKEN.MAT2X3:
      return [2, 3]
    case TOKEN.MAT2X4:
      return [2, 4]
    case TOKEN.MAT3X2:
      return [3, 2]
    case TOKEN.MAT3X3:
      return [3, 3]
    case TOKEN.MAT3X4:
      return [3, 4]
    case TOKEN.MAT4X2:
      return [4, 2]
    case TOKEN.MAT4X3:
      return [4, 3]
    case TOKEN.MAT4X4:
      return [4, 4]
    default:
      return undefined
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

const VEC_TYPES = [TOKEN.VEC2, TOKEN.VEC3, TOKEN.VEC4]
const UVEC_TYPES = [TOKEN.UVEC2, TOKEN.UVEC3, TOKEN.UVEC4]
const IVEC_TYPES = [TOKEN.IVEC2, TOKEN.IVEC3, TOKEN.IVEC4]
type T4 = [TokenType, TokenType, TokenType, TokenType]
const VALID_BINARY_OPERATIONS: T4[] = [
  ...[TOKEN.PLUS, TOKEN.DASH, TOKEN.STAR, TOKEN.SLASH].flatMap<T4>((op) => [
    // the two operators are scalars
    [op, TOKEN.FLOAT, TOKEN.FLOAT, TOKEN.FLOAT],
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    // one is a scalar, the other is a vector or matrix
    ...[...VEC_TYPES, ...MATRIX_TYPES].flatMap<T4>((t) => [
      [op, TOKEN.FLOAT, t, t],
      [op, t, TOKEN.FLOAT, t],
    ]),
    ...IVEC_TYPES.flatMap<T4>((t) => [
      [op, TOKEN.INT, t, t],
      [op, t, TOKEN.INT, t],
    ]),
    ...UVEC_TYPES.flatMap<T4>((t) => [
      [op, TOKEN.UINT, t, t],
      [op, t, TOKEN.UINT, t],
    ]),
    // the two operands are vectors of the same size
    ...[...VEC_TYPES, ...UVEC_TYPES, ...IVEC_TYPES].map<T4>((t) => [
      op,
      t,
      t,
      t,
    ]),
  ]),
  // The operator is add (+), subtract (-), or divide (/), and the operands are matrices with the same
  // number of rows and the same number of columns.  In this case, the operation is done component-
  // wise resulting in the same size matrix.
  ...[TOKEN.PLUS, TOKEN.DASH, TOKEN.SLASH].flatMap<T4>((op) =>
    MATRIX_TYPES.map<T4>((t) => [op, t, t, t]),
  ),
  // MAT_COLS_X_ROWS
  // columns of lhs === rows of rhs
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
  ].flatMap<T4>((op) => [
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    ...UVEC_TYPES.flatMap<T4>((t) => [
      [op, TOKEN.UINT, t, t],
      [op, t, TOKEN.UINT, t],
      [op, t, t, t],
    ]),
    ...IVEC_TYPES.flatMap<T4>((t) => [
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
  ].flatMap<T4>((op) => [
    [op, TOKEN.FLOAT, TOKEN.FLOAT, TOKEN.FLOAT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
  ]),
  [TOKEN.AND_OP, TOKEN.BOOL, TOKEN.BOOL, TOKEN.BOOL],
  [TOKEN.OR_OP, TOKEN.BOOL, TOKEN.BOOL, TOKEN.BOOL],
  [TOKEN.XOR_OP, TOKEN.BOOL, TOKEN.BOOL, TOKEN.BOOL],

  // The shift operators (<<) and (>>).  For both operators, the operands must be signed or unsigned
  // integers or integer vectors.  One operand can be signed while the other is unsigned.  In all cases, the
  // resulting type will be the same type as the left operand.  If the first operand is a scalar, the second
  // operand has to be a scalar as well.  If the first operand is a vector, the second operand must be a scalar
  // or a vector with the same size as the first operand, and the result is computed component-wise. [...]
  ...[TOKEN.LEFT_OP, TOKEN.RIGHT_OP].flatMap<T4>((op) => [
    [op, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [op, TOKEN.INT, TOKEN.UINT, TOKEN.INT],
    [op, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    [op, TOKEN.UINT, TOKEN.INT, TOKEN.UINT],
    ...[...UVEC_TYPES, ...IVEC_TYPES].flatMap<T4>((t, i) => [
      [op, t, TOKEN.INT, t],
      [op, t, TOKEN.UINT, t],
      [op, t, UVEC_TYPES[i % 3], t],
      [op, t, IVEC_TYPES[i % 3], t],
    ]),
  ]),
]
// console.table(VALID_BINARY_OPERATIONS.map((x) => x.map((y) => y.PATTERN)))
console.log("VALID_BINARY_OPERATIONS.length", VALID_BINARY_OPERATIONS.length)

function allDefined<T>(ts: (T | undefined)[]): ts is T[] {
  return ts.every(Boolean)
}

class CheckerVisitor extends AbstractVisitor<NormalizedType> {
  private currentFunctionPrototypeReturnType: NormalizedType | undefined =
    undefined

  assignmentExpression(n: AssignmentExpression) {
    // We parse conditionExpressions on the LHS, but only unaryExpressions are allowed.

    if (!isLValue(n.lhs)) {
      markError(n.lhs, "S0027")
    }

    const lType = this.visit(n.lhs)
    const rType = this.visit(n.rhs)
    if (typesNotEqual(lType, rType)) {
      // TODO better error code?
      markError(n, "S0004", lType, rType)
    }
    return lType
  }

  selectionStatement(n: SelectionStatement): NormalizedType | undefined {
    const cType = this.visit(n.condition)
    this.visit(n.yes)
    this.visit(n.no)
    if (typesNotEqual(cType, NormalizedType.BOOL)) {
      markError(n.condition, "S0003")
    }
    return
  }

  forStatement(n: ForStatement): NormalizedType | undefined {
    this.visit(n.initExpression)
    const cType = this.visit(n.conditionExpression)
    this.visit(n.loopExpression)
    this.visit(n.statement)
    if (typesNotEqual(cType, NormalizedType.BOOL)) {
      markError(n.conditionExpression, "S0003")
    }
    return
  }

  whileStatement(n: WhileStatement): NormalizedType | undefined {
    const cType = this.visit(n.conditionExpression)
    this.visit(n.statement)
    if (typesNotEqual(cType, NormalizedType.BOOL)) {
      markError(n.conditionExpression, "S0003")
    }
    return
  }

  doWhileStatement(n: DoWhileStatement): NormalizedType | undefined {
    this.visit(n.statement)
    const cType = this.visit(n.conditionExpression)
    if (typesNotEqual(cType, NormalizedType.BOOL)) {
      markError(n.conditionExpression, "S0003")
    }
    return
  }

  switchStatement(n: SwitchStatement): NormalizedType | undefined {
    const iType = this.visit(n.initExpression)
    if (
      typesNotEqual(iType, NormalizedType.INT) &&
      typesNotEqual(iType, NormalizedType.UINT)
    ) {
      markError(n.initExpression, "S0057")
    }
    this.visit(n.body)
    return super.switchStatement(n)
  }

  arrayAccess(n: ArrayAccess): NormalizedType | undefined {
    const iType = this.visit(n.index)
    if (
      typesNotEqual(iType, NormalizedType.INT) &&
      typesNotEqual(iType, NormalizedType.UINT)
    ) {
      markError(n, "S0002")
    }

    const oType = this.visit(n.on)
    if (oType?.kind === "array") {
      // array access
      return oType.of
    } else if (isVectorType(oType)) {
      return NormalizedType(getVectorElementType(oType.type))
    } else if (isMatrixType(oType)) {
      // return column
      const [, mRows] = getMatrixDimensions(oType.type)!
      return NormalizedType(getVectorType(TOKEN.FLOAT, mRows))
    }
    // TODO: if constant expression, check array access size
  }

  variableExpression(n: VariableExpression): NormalizedType | undefined {
    const binding: VariableBinding | undefined = n.binding

    return binding?.type
  }

  fieldAccess(n: FieldAccess): NormalizedType | undefined {
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

        return NormalizedType(
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
          `field ${f} is not defined on type ${oType.specifier.name}`,
        )
      }
    } else {
      markError(n.field, "field access cannot be used on array")
    }
  }

  binaryExpression(n: BinaryExpression): NormalizedType | undefined {
    const lType = this.visit(n.lhs)
    const rType = this.visit(n.rhs)

    function markErr(n: BinaryExpression) {
      markError(
        n,
        "S0004",
        "TODO lhs op rhs",
        "valid ops for " +
          n.op.tokenType.PATTERN +
          " are\n" +
          VALID_BINARY_OPERATIONS.filter(([op]) => op === n.op.tokenType)
            .map(
              ([op, lhs, rhs]) =>
                `  ${lhs.PATTERN} ${op.PATTERN} ${rhs.PATTERN}`,
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

  unaryExpression(n: UnaryExpression): NormalizedType | undefined {
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
        if (typesNotEqual(oType, NormalizedType.BOOL)) {
          markError(
            n,
            "S0004",
            "Unary operator for ! is only applicable to bool.",
          )
        }
        return NormalizedType.BOOL
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

  conditionalExpression(n: ConditionalExpression): NormalizedType | undefined {
    const cType = this.visit(n.condition)
    const yType = this.visit(n.yes)
    const nType = this.visit(n.no)

    if (typesNotEqual(cType, NormalizedType.BOOL)) {
      markError(n.condition, "S0005")
    }
    if (typesNotEqual(yType, nType)) {
      markError(n, "S0006", yType, nType)
    }
    return yType
  }

  returnStatement(n: ReturnStatement): NormalizedType | undefined {
    if (!this.currentFunctionPrototypeReturnType) {
      throw new Error()
    }
    const wType = this.visit(n.what)
    if (
      typesEqual(this.currentFunctionPrototypeReturnType, NormalizedType.VOID)
    ) {
      if (n.what) {
        markError(n.what, "S0039")
      }
    } else {
      if (!n.what) {
        markError(n, "S0038")
      } else {
        if (typesNotEqual(wType, this.currentFunctionPrototypeReturnType)) {
          markError(n.what, "S0042")
        }
      }
    }
    return super.returnStatement(n)
  }

  functionPrototype(n: FunctionPrototype): NormalizedType | undefined {
    this.currentFunctionPrototypeReturnType = undefined
    super.functionPrototype(n)
    this.currentFunctionPrototypeReturnType = undefined
    return
  }

  public functionDefinition(n: FunctionDefinition): NormalizedType | undefined {
    if (this.currentFunctionPrototypeReturnType) {
      throw new Error()
    }
    // TODO figure out function return type
    this.currentFunctionPrototypeReturnType = n.returnTypeResolved
    super.functionDefinition(n)
    this.currentFunctionPrototypeReturnType = undefined
    return
  }

  public functionCall(n: FunctionCall): NormalizedType | undefined {
    const aTypes = n.args.map((a) => this.visit(a))
    const ts = n.what.typeSpecifierNonArray
    if (
      !n.what.arraySpecifier &&
      isToken(ts) &&
      ts.tokenType === TOKEN.IDENTIFIER
    ) {
      // form IDENTIFIER(args)
      // could be either struct constructor or function call
      const binding = n.binding
      if (binding?.kind === "struct") {
        if (allDefined(aTypes)) {
          const expectedArgs: NormalizedType[] = Object.values(
            binding.type.fields,
          ).map((f) => f.type)
          if (!isEqualWith(aTypes, expectedArgs)) {
            markError(n, "S0007", `expected ${expectedArgs} but was ${aTypes}`)
          }
        }
        return binding.type
      } else if (binding?.kind === "function") {
        if (allDefined(aTypes)) {
          const overload = findMatchingFunctionDefinition(aTypes, binding)
          if (overload) {
            return overload.result
          } else {
            markError(n, "no matching overload for params", aTypes)
          }
        }
      } else if (binding?.kind === "variable") {
        markError(n.what, "cannot call variable")
      }
    } else if (!n.what.arraySpecifier && isToken(ts)) {
      // BASIC_TYPE(args)

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
          markError(n.what, "S0009", `Need ${needed} but only got ${provided}`)
        }
      }

      if (getScalarType(ts.tokenType)) {
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
      } else if (getVectorSize(ts.tokenType)) {
        const needed = getVectorSize(ts.tokenType)
        fillVectorOrMatrixConstructor(needed)
      } else if (getMatrixDimensions(ts.tokenType)) {
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
          const needed = getComponentCount(ts.tokenType)!
          fillVectorOrMatrixConstructor(needed)
        }
      }
      return { kind: "basic", type: ts.tokenType }
    }
  }

  constantExpression(n: ConstantExpression): NormalizedType | undefined {
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

    return { kind: "basic", type: getConstantType(n._const.tokenType) }
  }
}

const BINDER_VISITOR = new BinderVisitor()
const CHECKER_VISITOR = new CheckerVisitor()

export function check(u: TranslationUnit): Error[] {
  const result = errors
  BINDER_VISITOR.visit(u)
  CHECKER_VISITOR.visit(u)
  errors = []
  return result
}
