import {
  AbstractVisitor,
  AssignmentExpression,
  BinaryExpression,
  CompoundStatement,
  ConditionalExpression,
  ConstantExpression,
  Declarator,
  DoWhileStatement,
  FieldAccess,
  ForStatement,
  FunctionCall,
  FunctionDefinition,
  FunctionPrototype,
  InitDeclaratorListDeclaration,
  Node,
  ParameterDeclaration,
  ReturnStatement,
  SelectionStatement,
  StructSpecifier,
  Token,
  TranslationUnit,
  VariableExpression,
  WhileStatement,
} from "./nodes"
import { last } from "lodash"
import { TokenType } from "chevrotain"
import { isToken } from "./prettier-plugin"
import {
  MAT2X2,
  MAT2X3,
  MAT2X4,
  MAT3X2,
  MAT3X3,
  MAT3X4,
  MAT4X2,
  MAT4X3,
  MAT4X4,
  TOKEN,
} from "./lexer"

let errors: { where: Token | Node; err: string }[] = []
function markError(
  where: Token | Node,
  err: string,
  ...args: (NormalizedType | string | undefined)[]
) {
  errors.push({ where, err })
}

function isLValue(l: Node): boolean {
  if (l.type === "variableExpression") return true
  if (l.type === "fieldAccess") return isLValue(l.on)
  if (l.type === "arrayAccess") return isLValue(l.on)
  // if (l.type === "parenExpression")
  return false
}

interface NormalizedType {
  type: TokenType | StructSpecifier
  size: number // 0 = no array
}
function NormalizedType(type: TokenType | undefined) {
  return type && { type, size: 0 }
}
namespace NormalizedType {
  export const FLOAT = { type: TOKEN.FLOAT, size: 0 }
  export const BOOL = { type: TOKEN.BOOL, size: 0 }
  export const VOID = { type: TOKEN.VOID, size: 0 }
  export const INT = { type: TOKEN.INT, size: 0 }
  export const UINT = { type: TOKEN.UINT, size: 0 }
}

function isConstructorCall(b: FunctionCall): boolean {
  return b.what.type == "typeSpecifier"
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
      value: (value as bigint) & BigInt("0xffff_ffff"),
    }
  } else if (aType === TOKEN.UINT) {
    return {
      type: NormalizedType.INT,
      value: mod(value as bigint, BigInt("0xffff_ffff")),
    }
  } else {
    throw new Error()
  }
}

function mod(x: bigint, a: bigint) {
  return ((x % a) + a) % a
}

function evaluateConstantExpression(n: Node): {
  type: NormalizedType
  value: any
} {
  function evalIntConstant(s: string) {
    return BigInt(s)
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
    case "binaryExpression":
      const l = evaluateConstantExpression(n.lhs)
      const r = evaluateConstantExpression(n.rhs)
      if (
        typesEqual(l.type, NormalizedType.FLOAT) ||
        typesEqual(l.type, NormalizedType.INT) ||
        typesEqual(l.type, NormalizedType.UINT) ||
        typesEqual(l.type, NormalizedType.BOOL)
      ) {
        if (typesNotEqual(l.type, l.type)) {
          throw new Error("types don't match")
        } else {
          const lv = l.value
          const rv = r.value
          return evaluateBinaryOp(n.op, lv, rv, l.type.type as TokenType)
        }
      } else if (
        isToken(l.type.type) &&
        getVectorSize(l.type.type.tokenType) !== 0
      ) {
        const vectorSize = getVectorSize(l.type.type.tokenType)
        if (
          isToken(l.type.type) &&
          getVectorSize(l.type.type.tokenType) === vectorSize
        ) {
          // two vectors
          return {
            type: l.type,
            value: (l.value as any[]).map((lv, i) =>
              evaluateBinaryOp(n.op, lv, r.value[i], l.type.type as TokenType),
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
    case "commaExpression":
      throw new Error("commaExpression not supported in constant expression")
    default:
      throw new Error("???")
  }
}

function isConstantExpression(n: Node): boolean {
  function isBuiltInFunctionCall(n: FunctionCall): boolean {
    // TODO
    return n.what.type === "typeSpecifier"
  }

  switch (n.type) {
    case "constantExpression":
      return true
    case "variableExpression": // TODO check if defined as const
      return true
    case "binaryExpression":
      return isConstantExpression(n.lhs) && isConstantExpression(n.rhs)
    case "unaryExpression":
    case "postfixExpression":
      return isConstantExpression(n.on)
    case "functionCall":
      return (
        isConstructorCall(n) ||
        (isBuiltInFunctionCall(n) &&
          n.args.every((a) => isConstantExpression(a)))
      )
    default:
      return false
  }
}

interface Scope {
  parent: Scope | undefined
  defs: {
    [k: string]: {
      type: "function" | "struct" | "variable"
      dl?: InitDeclaratorListDeclaration
      d?: Declarator
      pd?: ParameterDeclaration
      overloads?: {
        args: NormalizedType[]
        def: FunctionDefinition | FunctionPrototype
      }[]
    }
  }
}

function isTokenType(type: TokenType | StructSpecifier): type is TokenType {
  return typeof type.name === "string"
}

function typesEqual(
  a: NormalizedType | undefined,
  b: NormalizedType | undefined,
): boolean {
  if (!a || !b) return false
  if (a.size !== b.size) return false
  if (isTokenType(a.type)) {
    if (!isTokenType(b.type) || a.type !== b.type) return false
  } else {
    throw new Error()
  }
  return true
}
function typesNotEqual(
  a: NormalizedType | undefined,
  b: NormalizedType | undefined,
): boolean {
  if (!a || !b) return false
  return !typesEqual(a, b)
}

function findMatchingFunctionDefinition(
  paramTypes: NormalizedType[],
  existingDef: Scope["defs"][string],
) {
  const overloads = existingDef.overloads!
  for (const overload of overloads) {
    if (overload.args.every((a, i) => typesEqual(a, paramTypes[i]))) {
      return overload
    }
  }
  return undefined
}

class BinderVisitor extends AbstractVisitor<any> {
  scopes: Scope[] = []

  get scope() {
    const s = last(this.scopes)
    if (!s) throw new Error()
    return s
  }

  pushScope() {
    this.scopes.push({ parent: this.scope, defs: {} })
  }

  popScope() {
    this.scopes.pop()
  }

  variableExpression(n: VariableExpression) {
    let scope: Scope | undefined = this.scope
    while (scope) {
      const x = scope.defs[n.var.image]
      if (x) {
        n.binding = x
        return
      }
      scope = scope.parent
    }
    markError(n, "G0002")
  }

  initDeclaratorListDeclaration(n: InitDeclaratorListDeclaration) {
    for (const d of n.declarators) {
      // Bind array specifier and initializer first.
      this.declarator(d)

      const existingDef = this.scope.defs[d.name.image]
      if (existingDef) {
        markError(d, "S0022")
      } else {
        this.scope.defs[d.name.image] = { type: "variable", dl: n, d }
      }
    }
  }

  translationUnit(n: TranslationUnit) {
    this.pushScope()
    super.translationUnit(n)
    this.popScope()
  }

  functionDefinition(n: FunctionDefinition) {
    this.pushScope()
    super.functionDefinition(n)
    this.popScope()

    const existingDef = this.scope.defs[n.name.image]
    if (existingDef.type != "function") {
      markError(n, "S0024")
    }
    const paramTypes = n.params.map((p): NormalizedType => {
      return {
        type: isToken(p.typeSpecifier.typeSpecifierNonArray)
          ? p.typeSpecifier.typeSpecifierNonArray.tokenType
          : p.typeSpecifier.typeSpecifierNonArray,
        size:
          Number(
            evaluateConstantExpression(
              p.typeSpecifier.arraySpecifier?.size || p.arraySpecifier?.size!,
            ).value as bigint,
          ) || 0,
      }
    })
    if (existingDef) {
      findMatchingFunctionDefinition(paramTypes, existingDef)
    }
  }
  parameterDeclaration(n: ParameterDeclaration) {
    super.parameterDeclaration(n)

    if (n.pName) {
      const existingDef = this.scope.defs[n.pName.image]
      if (existingDef) {
        markError(n, "S0022")
      } else {
        this.scope.defs[n.pName.image] = { type: "variable", pd: n }
      }
    }
  }

  compoundStatement(n: CompoundStatement) {
    this.pushScope()
    super.compoundStatement(n)
    this.popScope()
  }
}

function isUnknownType(cType: NormalizedType) {
  return false
}

function isVectorType(n: NormalizedType): boolean {
  return (
    n.size === 0 && isToken(n.type) && getVectorSize(n.type.tokenType) !== 0
  )
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
    ...[...VEC_TYPES, ...MATRIX_TYPES].flatMap((t) => [
      [op, TOKEN.FLOAT, t, t] as T4,
      [op, t, TOKEN.FLOAT, t] as T4,
    ]),
    ...IVEC_TYPES.flatMap((t) => [
      [op, TOKEN.INT, t, t] as T4,
      [op, t, TOKEN.INT, t] as T4,
    ]),
    ...UVEC_TYPES.flatMap((t) => [
      [op, TOKEN.UINT, t, t] as T4,
      [op, t, TOKEN.UINT, t] as T4,
    ]),
    // the two operators are vectors of the same size
    ...[...VEC_TYPES, UVEC_TYPES, IVEC_TYPES].map((t) => [op, t, t, t] as T4),
  ]),
  // The operator is add (+), subtract (-), or divide (/), and the operands are matrices with the same
  // number of rows and the same number of columns.  In this case, the operation is done component-
  // wise resulting in the same size matrix.
  ...[TOKEN.PLUS, TOKEN.DASH, TOKEN.SLASH].flatMap((op) =>
    MATRIX_TYPES.map((t) => [op, t, t, t] as T4),
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

  [TOKEN.PERCENT, TOKEN.INT, TOKEN.INT, TOKEN.INT],
  [TOKEN.PERCENT, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
  ...UVEC_TYPES.flatMap<T4>((t) => [
    [TOKEN.PERCENT, TOKEN.UINT, t, t],
    [TOKEN.PERCENT, t, TOKEN.UINT, t],
    [TOKEN.PERCENT, t, t, t],
  ]),
  ...VEC_TYPES.flatMap<T4>((t) => [
    [TOKEN.PERCENT, TOKEN.INT, t, t],
    [TOKEN.PERCENT, t, TOKEN.INT, t],
    [TOKEN.PERCENT, t, t, t],
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
]
console.table(VALID_BINARY_OPERATIONS.map((x) => x.map((y) => y.PATTERN)))
console.log("VALID_BINARY_OPERATIONS.length", VALID_BINARY_OPERATIONS.length)

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

  fieldAccess(n: FieldAccess): NormalizedType | undefined {
    const oType = this.visit(n.on)
    if (oType && isVectorType(oType)) {
      const f = n.field.image
      if (/^[xyzwrgbastpq]+$/.test(f)) {
        // treat as field swizzle
        if (!/^[xyzw]+|[rgba]+|[stpq]+$/.test(f)) {
          markError(n.field, "S0025")
        } else if (f.length > 4) {
          markError(n.field, "S0026", "Swizzle can select at most 4 fields.")
        } else {
          const vectorSize = getVectorSize(oType.type as TokenType)
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
          getVectorType(
            getVectorElementType(oType.type as TokenType)!,
            f.length,
          ),
        )
      }
    }
    return super.fieldAccess(n)
  }

  binaryExpression(n: BinaryExpression): NormalizedType | undefined {
    const lType = this.visit(n.lhs)
    const rType = this.visit(n.rhs)
    return super.binaryExpression(n)
  }

  conditionalExpression(n: ConditionalExpression) {
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
    if (this.currentFunctionPrototypeReturnType) {
      throw new Error()
    }
    // TODO figure out function return type
    this.currentFunctionPrototypeReturnType = undefined
    super.functionPrototype(n)
    this.currentFunctionPrototypeReturnType = undefined
    return
  }
  constantExpression(n: ConstantExpression): NormalizedType | undefined {
    switch (n._const.tokenType) {
      case TOKEN.INTCONSTANT:
        return NormalizedType(TOKEN.INT)
      case TOKEN.UINTCONSTANT:
        return NormalizedType(TOKEN.UINT)
      case TOKEN.FLOATCONSTANT:
        return NormalizedType(TOKEN.FLOAT)
      case TOKEN.BOOLCONSTANT:
        return NormalizedType(TOKEN.BOOL)
    }
  }
}

const CHECKER_VISITOR = new CheckerVisitor()
export function check(u: TranslationUnit) {
  const result = errors
  CHECKER_VISITOR.visit(u)
  errors = []
  return result
}
