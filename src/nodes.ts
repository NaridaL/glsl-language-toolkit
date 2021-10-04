import { IToken } from "chevrotain"

export type Token = IToken

export interface BaseNode {
  children?: Node[]
  firstToken?: Token
  lastToken?: Token
}

export interface ArraySpecifier extends BaseNode {
  type: "arraySpecifier"
  size: Expression | undefined
}

export interface BinaryExpression extends BaseNode {
  type: "binaryExpression"
  lhs: Expression
  rhs: Expression
  op: Token
}

export interface MethodCall extends BaseNode {
  type: "methodCall"
  on: Expression
  functionCall: FunctionCall
}

export interface FunctionCall extends BaseNode {
  type: "functionCall"
  what: TypeSpecifier
  args: Expression[]
}

export interface ArrayAccess extends BaseNode {
  type: "arrayAccess"
  on: Expression
  index: Expression
}

export interface TranslationUnit extends BaseNode {
  type: "translationUnit"
  declarations: Declaration[]
  comments?: Token[]
}

export interface AssignmentExpression extends BaseNode {
  type: "assignmentExpression"
  op: Token
  lhs: Expression
  rhs: Expression
}

export interface FieldAccess extends BaseNode {
  type: "fieldAccess"
  on: Expression
  field: Token
}

export interface ConditionalExpression extends BaseNode {
  type: "conditionalExpression"
  condition: Expression
  yes: Expression
  no: Expression
}

export interface PostfixExpression extends BaseNode {
  type: "postfixExpression"
  on: Expression
  op: Token
}
export interface VariableExpression extends BaseNode {
  type: "variableExpression"
  var: Token
}
export interface ConstantExpression extends BaseNode {
  type: "constantExpression"
  _const: Token
}

export interface CommaExpression extends BaseNode {
  type: "commaExpression"
  lhs: Expression
  rhs: Expression
}

export interface UnaryExpression extends BaseNode {
  type: "unaryExpression"
  on: Expression
  op: Token
}

export interface FunctionDefinition extends BaseNode {
  type: "functionDefinition"
  name: Token
  returnType: FullySpecifiedType
  params: ParameterDeclaration[]
  body: CompoundStatement
}

export interface FunctionPrototype extends BaseNode {
  type: "functionPrototype"
  name: Token
  returnType: FullySpecifiedType
  params: ParameterDeclaration[]
}

export interface ParameterDeclaration extends BaseNode {
  type: "parameterDeclaration"
  parameterTypeQualifier: Token | undefined
  pName: Token | undefined
  arraySpecifier: ArraySpecifier | undefined
  parameterQualifier: Token | undefined
  typeSpecifier: TypeSpecifier
}

export interface TypeSpecifier extends BaseNode {
  type: "typeSpecifier"
  precisionQualifier: Token | undefined
  typeSpecifierNonArray: Token | StructSpecifier
  arraySpecifier: ArraySpecifier | undefined
}

export interface CompoundStatement extends BaseNode {
  type: "compoundStatement"
  statements: Statement[]
  newScope: boolean
}

export interface ReturnStatement extends BaseNode {
  type: "returnStatement"
  what: Expression | undefined
}

export interface ContinueStatement extends BaseNode {
  type: "continueStatement"
}

export interface BreakStatement extends BaseNode {
  type: "breakStatement"
}

export interface DiscardStatement extends BaseNode {
  type: "discardStatement"
}

export interface Declarator extends BaseNode {
  type: "declarator"
  name: Token
  arraySpecifier: ArraySpecifier | undefined
  init: Expression | undefined
}

export interface DoWhileStatement extends BaseNode {
  type: "doWhileStatement"
  DO: Token
  WHILE: Token
  LEFT_PAREN: Token
  RIGHT_PAREN: Token
  conditionExpression: Expression
  statement: Statement
  SEMICOLON: Token
}

export interface WhileStatement extends BaseNode {
  type: "whileStatement"
  WHILE: Token
  LEFT_PAREN: Token
  RIGHT_PAREN: Token
  conditionExpression: Expression | InitDeclaratorListDeclaration
  statement: Statement
}

export interface ForStatement extends BaseNode {
  type: "forStatement"
  FOR: Token
  LEFT_PAREN: Token
  initExpression: Expression | undefined
  SEMICOLON1: Token | undefined
  conditionExpression: Expression | InitDeclaratorListDeclaration
  SEMICOLON2: Token
  loopExpression: Expression
  RIGHT_PAREN: Token
  statement: Statement
}

export interface ExpressionStatement extends BaseNode {
  type: "expressionStatement"
  expression: Expression
}

export type Expression =
  | ArrayAccess
  | AssignmentExpression
  | BinaryExpression
  | ConditionalExpression
  | FieldAccess
  | FunctionCall
  | MethodCall
  | PostfixExpression
  | UnaryExpression
  | CommaExpression
  | ConstantExpression
  | VariableExpression

export interface InitDeclaratorListDeclaration extends BaseNode {
  type: "initDeclaratorListDeclaration"
  fsType: FullySpecifiedType
  declarators: Declarator[]
}

export interface PrecisionDeclaration extends BaseNode {
  type: "precisionDeclaration"
  precisionQualifier: Token
  typeSpecifierNoPrec: TypeSpecifier
}

export interface SelectionStatement extends BaseNode {
  type: "selectionStatement"
  condition: Expression
  yes: Statement
  no: Statement | undefined
}

export interface StorageQualifier extends BaseNode {
  type: "storageQualifier"
  CENTROID: Token | undefined
  IN: Token | undefined
  OUT: Token | undefined
  CONST: Token | undefined
  UNIFORM: Token | undefined
}

export interface SwitchStatement extends BaseNode {
  type: "switchStatement"
  SWITCH: Token
  LEFT_PAREN: Token
  RIGHT_PAREN: Token
  initExpression: Expression
  body: CompoundStatement
}

export interface CaseLabel extends BaseNode {
  type: "caseLabel"
  _case: Expression | undefined
}

export interface FullySpecifiedType extends BaseNode {
  type: "fullySpecifiedType"
  typeQualifier: TypeQualifier | undefined
  typeSpecifier: TypeSpecifier
}

export interface TypeQualifier extends BaseNode {
  type: "typeQualifier"
  storageQualifier: StorageQualifier | undefined
  layoutQualifier: LayoutQualifier | undefined
  interpolationQualifier: Token | undefined
  invariantQualifier: Token | undefined
}

export interface StructSpecifier extends BaseNode {
  type: "structSpecifier"
  name: Token | undefined
  declarations: StructDeclaration[]
}

export interface LayoutQualifier extends BaseNode {
  type: "layoutQualifier"
  layoutQualifierIds: { IDENTIFIER: Token; init: Token | undefined }[]
}

export interface InvariantDeclaration extends BaseNode {
  type: "invariantDeclaration"
  INVARIANT: Token
  IDENTIFIER: Token
}

export interface StructDeclaration extends BaseNode {
  type: "structDeclaration"
  fsType: FullySpecifiedType
  declarators: Declarator[]
}

export type Declaration =
  | FunctionDefinition
  | FunctionPrototype
  | InitDeclaratorListDeclaration
  | PrecisionDeclaration
  | InvariantDeclaration
export type JumpStatement =
  | ReturnStatement
  | ContinueStatement
  | BreakStatement
  | DiscardStatement
export type IterationStatement =
  | DoWhileStatement
  | ForStatement
  | WhileStatement
export type Statement =
  | CaseLabel
  | CompoundStatement
  | ExpressionStatement
  | IterationStatement
  | JumpStatement
  | SelectionStatement
  | SwitchStatement
  | InitDeclaratorListDeclaration
export type Node =
  | ArraySpecifier
  | Declaration
  | Declarator
  | Expression
  | FullySpecifiedType
  | ParameterDeclaration
  | Statement
  | StorageQualifier
  | StructDeclaration
  | StructSpecifier
  | TranslationUnit
  | TypeQualifier
  | TypeSpecifier

export class AbstractVisitor<R> {
  visit(n: Node | undefined): R | undefined {
    return n && this[n.type](n as any)
  }
  arraySpecifier(n: ArraySpecifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  binaryExpression(n: BinaryExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  methodCall(n: MethodCall): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  functionCall(n: FunctionCall): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  arrayAccess(n: ArrayAccess): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  translationUnit(n: TranslationUnit): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  assignmentExpression(n: AssignmentExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  fieldAccess(n: FieldAccess): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  conditionalExpression(n: ConditionalExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  postfixExpression(n: PostfixExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  commaExpression(n: CommaExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  unaryExpression(n: UnaryExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  functionDefinition(n: FunctionDefinition): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  functionPrototype(n: FunctionPrototype): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  parameterDeclaration(n: ParameterDeclaration): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  typeSpecifier(n: TypeSpecifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  compoundStatement(n: CompoundStatement): R | undefined {
    n.statements.forEach((n) => this.visit(n))
    return
  }
  returnStatement(n: ReturnStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  continueStatement(n: ContinueStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  breakStatement(n: BreakStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  discardStatement(n: DiscardStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  declarator(n: Declarator): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  doWhileStatement(n: DoWhileStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  whileStatement(n: WhileStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  forStatement(n: ForStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  expressionStatement(n: ExpressionStatement): R | undefined {
    this.visit(n.expression)
    return
  }
  initDeclaratorListDeclaration(
    n: InitDeclaratorListDeclaration,
  ): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  precisionDeclaration(n: PrecisionDeclaration): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  selectionStatement(n: SelectionStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  storageQualifier(n: StorageQualifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  switchStatement(n: SwitchStatement): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  caseLabel(n: CaseLabel): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  fullySpecifiedType(n: FullySpecifiedType): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  typeQualifier(n: TypeQualifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  structSpecifier(n: StructSpecifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  layoutQualifier(n: LayoutQualifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  invariantDeclaration(n: InvariantDeclaration): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  structDeclaration(n: StructDeclaration): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  variableExpression(n: VariableExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  constantExpression(n: ConstantExpression): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
}
