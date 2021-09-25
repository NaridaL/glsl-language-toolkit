import { IToken } from "chevrotain"

export type Token = IToken
export interface ArrayInit {
  type: "arrayInit"
  index: Expression
}
export interface BinaryExpression {
  type: "binaryExpression"
  lhs: Expression
  rhs: Expression
  op: Token
}
export interface MethodCall {
  type: "methodCall"
  on: Expression
  functionCall: FunctionCall
}
export interface FunctionCall {
  type: "functionCall"
  what: Expression | TypeSpecifier
  args: Expression[]
}
export interface ArrayAccess {
  type: "arrayAccess"
  on: Expression
  index: Expression
}
export interface TranslationUnit {
  type: "translationUnit"
  declarations: Declaration[]
  comments?: Token[]
}
export interface AssignmentExpression {
  type: "assignmentExpression"
  op: Token
  lhs: Expression
  rhs: Expression
}
export interface FieldAccess {
  type: "fieldAccess"
  on: Expression
  field: Token
}
export interface ConditionalExpression {
  type: "conditionalExpression"
  condition: Expression
  yes: Expression
  no: Expression
}
export interface PostfixExpression {
  type: "postfixExpression"
  on: Expression
  op: Token
}
export interface CommaExpression {
  type: "commaExpression"
  lhs: Expression
  rhs: Expression
}
export interface PrefixExpression {
  type: "prefixExpression"
  on: Expression
  op: Token
}
export interface FunctionDefinition {
  type: "functionDefinition"
  name: Token
  returnType: FullySpecifiedType
  params: ParameterDeclaration[]
  body: CompoundStatement
}
export interface FunctionPrototype {
  type: "functionPrototype"
  name: Token
  returnType: FullySpecifiedType
  params: ParameterDeclaration[]
}
export interface ParameterDeclaration {
  type: "parameterDeclaration"
  parameterTypeQualifier: Token | undefined
  pName: Token | undefined
  arrayInit: unknown
  parameterQualifier: Token | undefined
  typeSpecifier: TypeSpecifier
}
export interface TypeSpecifier {
  type: "typeSpecifier"
  precisionQualifier: Token | undefined
  typeSpecifierNonArray: Token | StructSpecifier
  arraySpecifier: unknown
}
export interface CompoundStatement {
  type: "compoundStatement"
  statements: Statement[]
}
export interface ReturnStatement {
  type: "returnStatement"
  what: Expression | undefined
}
export interface ContinueStatement {
  type: "continueStatement"
}
export interface BreakStatement {
  type: "breakStatement"
}
export interface DiscardStatement {
  type: "discardStatement"
}
export interface Declarator {
  type: "declarator"
  name: Token
  arrayInit: unknown
  init: Expression | undefined
}
export interface DoWhileStatement {
  type: "doWhileStatement"
  DO: Token
  WHILE: Token
  LEFT_PAREN: Token
  RIGHT_PAREN: Token
  conditionExpression: Expression
  statement: Statement
  SEMICOLON: Token
}
export interface WhileStatement {
  type: "whileStatement"
  DO: Token
  WHILE: Token
  LEFT_PAREN: Token
  RIGHT_PAREN: Token
  conditionExpression: Expression
  statement: Statement
}
export interface ForStatement {
  type: "forStatement"
  FOR: Token
  LEFT_PAREN: Token
  initExpression: unknown
  SEMICOLON1: Token | undefined
  conditionExpression: Expression | InitDeclaratorListDeclaration
  SEMICOLON2: Token
  loopExpression: Expression
  RIGHT_PAREN: Token
  statement: Statement
}
export interface ExpressionStatement {
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
  | PrefixExpression
  | CommaExpression

export interface InitDeclaratorListDeclaration {
  type: "initDeclaratorListDeclaration"
  fsType: FullySpecifiedType
  declarators: Declarator[]
}
export interface PrecisionDeclaration {
  type: "precisionDeclaration"
  precisionQualifier: Token
  typeSpecifierNoPrec: TypeSpecifier
}
export interface SelectionStatement {
  type: "selectionStatement"
  IF: Token
  LEFT_PAREN: Token
  condition: Expression
  RIGHT_PAREN: Token
  yes: Statement
  ELSE: Token | undefined
  no: Statement | undefined
}
export interface StorageQualifier {
  type: "storageQualifier"
  CENTROID: Token | undefined
  IN: Token | undefined
  OUT: Token | undefined
  CONST: Token | undefined
  UNIFORM: Token | undefined
}
export interface SwitchStatement {
  type: "switchStatement"
  initExpression: Expression
  body: CompoundStatement
}
export interface CaseLabel {
  type: "caseLabel"
  case: Expression | undefined
}
export interface FullySpecifiedType {
  type: "fullySpecifiedType"
  typeQualifier: TypeQualifier
  typeSpecifier: TypeSpecifier
}
export interface TypeQualifier {
  type: "typeQualifier"
  storageQualifier: Token | undefined
  layoutQualifier: LayoutQualifier | undefined
  interpolationQualifier: Token | undefined
  invariantQualifier: Token | undefined
}
export interface StructSpecifier {
  type: "structSpecifier"
  name: Token | undefined
  declarations: StructDeclaration[]
}
export interface LayoutQualifier {
  type: "layoutQualifier"
  layoutQualifierIds: { IDENTIFIER: Token; init: Token | undefined }[]
}
export interface InvariantDeclaration {
  type: "invariantDeclaration"
  INVARIANT: Token
  IDENTIFIER: Token
}
export interface StructDeclaration {
  type: "structDeclaration"
  fsType: FullySpecifiedType
  declarators: { name: Token }[]
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
  | ArrayInit
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
