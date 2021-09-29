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
  UnaryExpression,
  VariableExpression,
  WhileStatement,
} from "./nodes"
import { last } from "lodash"
import { TokenType } from "chevrotain"
import { isToken } from "./prettier-plugin"
import { TOKEN } from "./lexer"
import _ from "lodash"

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

function isBasicType(
  n: NormalizedType | undefined,
): n is { size: 0; type: TokenType } {
  return n !== undefined && n.size === 0 && isTokenType(n.type)
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
    [TOKEN.PERCENT, TOKEN.INT, TOKEN.INT, TOKEN.INT],
    [TOKEN.PERCENT, TOKEN.UINT, TOKEN.UINT, TOKEN.UINT],
    ...UVEC_TYPES.flatMap<T4>((t) => [
      [TOKEN.PERCENT, TOKEN.UINT, t, t],
      [TOKEN.PERCENT, t, TOKEN.UINT, t],
      [TOKEN.PERCENT, t, t, t],
    ]),
    ...IVEC_TYPES.flatMap<T4>((t) => [
      [TOKEN.PERCENT, TOKEN.INT, t, t],
      [TOKEN.PERCENT, t, TOKEN.INT, t],
      [TOKEN.PERCENT, t, t, t],
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

    if (isBasicType(lType) && isBasicType(rType)) {
      const validOp = VALID_BINARY_OPERATIONS.find(
        ([op, lhs, rhs, _result]) =>
          op === n.op.tokenType && lhs === lType.type && rhs === rType.type,
      )
      if (validOp) {
        return NormalizedType(validOp[3])
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
    if (
      oType &&
      isBasicType(oType) &&
      (TOKEN.INT === oType.type ||
        TOKEN.UINT === oType.type ||
        TOKEN.FLOAT === oType.type ||
        VEC_TYPES.includes(oType.type) ||
        UVEC_TYPES.includes(oType.type) ||
        IVEC_TYPES.includes(oType.type) ||
        MATRIX_TYPES.includes(oType.type))
    ) {
      return oType
    } else if (oType) {
      markError(
        n,
        "S0004",
        `Valid operand types for ${n.op.tokenType} are integer, float, vector or matrix types, not `,
        oType,
      )
    }
    return
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
