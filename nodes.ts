import { IToken, TokenType } from "chevrotain"

export type Token = IToken
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
}
export interface ArrayAccess {
  type: "arrayAccess"
  on: Expression
  index: Expression
}
export interface TranslationUnit {
  type: "translationUnit"
  declarations: Declaration[]
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
export interface FunctionDeclaration {
  type: "functionDeclaration"
}
export interface FunctionDefinition {
  type: "functionDefinition"
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
  expression: Expression
  statement: Statement
  SEMICOLON: Token
}
export interface WhileStatement {
  type: "whileStatement"
  DO: Token
  WHILE: Token
  LEFT_PAREN: Token
  RIGHT_PAREN: Token
  expression: Expression
  statement: Statement
}
export interface ForStatement {
  type: "forStatement"
  FOR: Token
  LEFT_PAREN: Token
  initializer: unknown
  SEMICOLON1: Token | undefined
  condition: Expression
  SEMICOLON2: Token
  iteration: Expression
  RIGHT_PAREN: Token
  statement: Statement
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

export interface InitDeclaratorList {
  type: "initDeclaratorList"
  fsType: TypeSpecifier
  decls: Declarator[]
}
export interface SelectionStatement {
  type: "selectionStatement"
  IF: Token
  LEFT_PAREN: Token
  condition: Expression
  RIGHT_PAREN: Token
  yes: Statement
  ELSE: Token
  no: Statement
}
export interface StorageQualifier {
  CENTROID: Token | undefined
  IN: Token | undefined
  OUT: Token | undefined
  CONST: Token | undefined
  UNIFORM: Token | undefined
}
export interface SwitchStatement {
  type: "switchStatement"
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
  storageQualifier: Token
  layoutQualifier: Token
  interpolationQualifier: Token
  invariantQualifier: Token
}
export interface InvariantDeclaration {
  type: "invariantDeclaration"
  INVARIANT: Token
  IDENTIFIER: Token
}

export type Declaration = FunctionDeclaration | InitDeclaratorList
export type JumpStatement =
  | ReturnStatement
  | ContinueStatement
  | BreakStatement
  | DiscardStatement
export type IterationStatement =
  | ForStatement
  | DoWhileStatement
  | WhileStatement
export type Statement = CompoundStatement | JumpStatement | IterationStatement
export type Node =
  | Expression
  | Declaration
  | TranslationUnit
  | TypeSpecifier
  | ParameterDeclaration
  | Statement
  | FullySpecifiedType
  | StorageQualifier
