import { IToken } from "chevrotain"

export type Token = IToken

export interface BaseNode {
  kind: string
  children?: Node[]
  firstToken?: Token
  lastToken?: Token
  tokens?: Token[]
}

export interface ArraySpecifier extends BaseNode {
  kind: "arraySpecifier"
  size: Expression | undefined
}

export interface BinaryExpression extends BaseNode {
  kind: "binaryExpression"
  lhs: Expression
  rhs: Expression
  op: Token
}

export interface MethodCall extends BaseNode {
  kind: "methodCall"
  on: Expression
  functionCall: FunctionCall
}

export interface FunctionCall extends BaseNode {
  kind: "functionCall"
  callee: TypeSpecifier
  args: Expression[]
}

export interface ArrayAccess extends BaseNode {
  kind: "arrayAccess"
  on: Expression
  index: Expression
}

export interface TranslationUnit extends BaseNode {
  kind: "translationUnit"
  declarations: Declaration[]
  comments?: Token[]
}

export interface AssignmentExpression extends BaseNode {
  kind: "assignmentExpression"
  op: Token
  lhs: Expression
  rhs: Expression
}

export interface FieldAccess extends BaseNode {
  kind: "fieldAccess"
  on: Expression
  field: Token
}

export interface ConditionalExpression extends BaseNode {
  kind: "conditionalExpression"
  condition: Expression
  yes: Expression
  no: Expression
}

export interface PostfixExpression extends BaseNode {
  kind: "postfixExpression"
  on: Expression
  op: Token
}
export interface VariableExpression extends BaseNode {
  kind: "variableExpression"
  var: Token
}
export interface ConstantExpression extends BaseNode {
  kind: "constantExpression"
  _const: Token
}

export interface CommaExpression extends BaseNode {
  kind: "commaExpression"
  lhs: Expression
  rhs: Expression
}

export interface UnaryExpression extends BaseNode {
  kind: "unaryExpression"
  on: Expression
  op: Token
}

export interface FunctionDefinition extends BaseNode {
  kind: "functionDefinition"
  name: Token
  returnType: FullySpecifiedType
  params: ParameterDeclaration[]
  body: CompoundStatement
}

export interface FunctionPrototype extends BaseNode {
  kind: "functionPrototype"
  name: Token
  returnType: FullySpecifiedType
  params: ParameterDeclaration[]
}

export interface ParameterDeclaration extends BaseNode {
  kind: "parameterDeclaration"
  parameterTypeQualifier: Token | undefined
  parameterQualifier: Token | undefined
  pName: Token | undefined
  arraySpecifier: ArraySpecifier | undefined
  typeSpecifier: TypeSpecifier
}

export interface TypeSpecifier extends BaseNode {
  kind: "typeSpecifier"
  precisionQualifier: Token | undefined
  typeSpecifierNonArray: Token | StructSpecifier
  arraySpecifier: ArraySpecifier | undefined
}

export interface CompoundStatement extends BaseNode {
  kind: "compoundStatement"
  statements: Statement[]
  newScope: boolean
}

export interface ReturnStatement extends BaseNode {
  kind: "returnStatement"
  what: Expression | undefined
}

export interface ContinueStatement extends BaseNode {
  kind: "continueStatement"
}

export interface BreakStatement extends BaseNode {
  kind: "breakStatement"
}

export interface DiscardStatement extends BaseNode {
  kind: "discardStatement"
}

export interface Declarator extends BaseNode {
  kind: "declarator"
  name: Token
  arraySpecifier: ArraySpecifier | undefined
  init: Expression | undefined
}

export interface DoWhileStatement extends BaseNode {
  kind: "doWhileStatement"
  conditionExpression: Expression
  statement: Statement
}

export interface WhileStatement extends BaseNode {
  kind: "whileStatement"
  conditionExpression: Expression | InitDeclaratorListDeclaration
  statement: Statement
}

export interface ForStatement extends BaseNode {
  kind: "forStatement"
  initExpression: Expression | undefined
  conditionExpression: Expression | InitDeclaratorListDeclaration
  loopExpression: Expression
  statement: Statement
}

export interface ExpressionStatement extends BaseNode {
  kind: "expressionStatement"
  expression: Expression
}

export interface UniformBlock extends BaseNode {
  kind: "uniformBlock"
  blockName: Token
  declarations: StructDeclaration[]
  namespace: Token | undefined
  arraySpecifier: ArraySpecifier | undefined
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
  kind: "initDeclaratorListDeclaration"
  fsType: FullySpecifiedType
  declarators: Declarator[]
}

export interface PrecisionDeclaration extends BaseNode {
  kind: "precisionDeclaration"
  precisionQualifier: Token
  typeSpecifierNoPrec: TypeSpecifier
}

export interface SelectionStatement extends BaseNode {
  kind: "selectionStatement"
  condition: Expression
  yes: Statement
  no: Statement | undefined
}

export interface StorageQualifier extends BaseNode {
  kind: "storageQualifier"
  CENTROID: Token | undefined
  IN: Token | undefined
  OUT: Token | undefined
  CONST: Token | undefined
  UNIFORM: Token | undefined
}

export interface SwitchStatement extends BaseNode {
  kind: "switchStatement"
  initExpression: Expression
  body: CompoundStatement
}

export interface CaseLabel extends BaseNode {
  kind: "caseLabel"
  _case: Expression | undefined
}

export interface FullySpecifiedType extends BaseNode {
  kind: "fullySpecifiedType"
  typeQualifier: TypeQualifier | undefined
  typeSpecifier: TypeSpecifier
}

export interface TypeQualifier extends BaseNode {
  kind: "typeQualifier"
  storageQualifier: StorageQualifier | undefined
  layoutQualifier: LayoutQualifier | undefined
  interpolationQualifier: Token | undefined
  invariantQualifier: Token | undefined
}

export interface StructSpecifier extends BaseNode {
  kind: "structSpecifier"
  name: Token | undefined
  declarations: StructDeclaration[]
}

export interface LayoutQualifier extends BaseNode {
  kind: "layoutQualifier"
  layoutQualifierIds: { IDENTIFIER: Token; init: Token | undefined }[]
}

export interface InvariantDeclaration extends BaseNode {
  kind: "invariantDeclaration"
  INVARIANT: Token
  IDENTIFIER: Token
}

export interface StructDeclaration extends BaseNode {
  kind: "structDeclaration"
  fsType: FullySpecifiedType
  declarators: Declarator[]
}

export type Declaration =
  | FunctionDefinition
  | FunctionPrototype
  | InitDeclaratorListDeclaration
  | PrecisionDeclaration
  | InvariantDeclaration
  | UniformBlock
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
  | LayoutQualifier
  | ParameterDeclaration
  | Statement
  | StorageQualifier
  | StructDeclaration
  | StructSpecifier
  | TranslationUnit
  | TypeQualifier
  | TypeSpecifier

export class AbstractVisitor<R> {
  protected visit(n: Node | undefined): R | undefined {
    return n && this[n.kind](n as any)
  }
  protected arraySpecifier(n: ArraySpecifier): R | undefined {
    this.visit(n.size)
    return
  }
  protected binaryExpression(n: BinaryExpression): R | undefined {
    this.visit(n.lhs)
    this.visit(n.rhs)
    return
  }
  protected methodCall(n: MethodCall): R | undefined {
    this.visit(n.on)
    this.visit(n.functionCall)
    return
  }
  protected functionCall(n: FunctionCall): R | undefined {
    this.visit(n.callee)
    n.args.forEach((a) => this.visit(a))
    return
  }
  protected arrayAccess(n: ArrayAccess): R | undefined {
    this.visit(n.on)
    this.visit(n.index)
    return
  }
  protected translationUnit(n: TranslationUnit): R | undefined {
    n.declarations?.forEach((n) => this.visit(n))
    return
  }
  protected assignmentExpression(n: AssignmentExpression): R | undefined {
    this.visit(n.lhs)
    this.visit(n.rhs)
    return
  }
  protected fieldAccess(n: FieldAccess): R | undefined {
    this.visit(n.on)
    return
  }
  protected conditionalExpression(n: ConditionalExpression): R | undefined {
    this.visit(n.condition)
    this.visit(n.yes)
    this.visit(n.no)
    return
  }
  protected postfixExpression(n: PostfixExpression): R | undefined {
    this.visit(n.on)
    return
  }
  protected commaExpression(n: CommaExpression): R | undefined {
    this.visit(n.lhs)
    this.visit(n.rhs)
    return
  }
  protected unaryExpression(n: UnaryExpression): R | undefined {
    this.visit(n.on)
    return
  }
  protected functionDefinition(n: FunctionDefinition): R | undefined {
    this.visit(n.returnType)
    n.params.forEach((p) => this.visit(p))
    this.visit(n.body)
    return
  }
  protected functionPrototype(n: FunctionPrototype): R | undefined {
    this.visit(n.returnType)
    n.params.forEach((p) => this.visit(p))
    return
  }
  protected parameterDeclaration(n: ParameterDeclaration): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  protected typeSpecifier(n: TypeSpecifier): R | undefined {
    n.children?.forEach((n) => this.visit(n))
    return
  }
  protected compoundStatement(n: CompoundStatement): R | undefined {
    n.statements.forEach((n) => this.visit(n))
    return
  }
  protected returnStatement(n: ReturnStatement): R | undefined {
    this.visit(n.what)
    return
  }
  protected continueStatement(n: ContinueStatement): R | undefined {
    return
  }
  protected breakStatement(n: BreakStatement): R | undefined {
    return
  }
  protected discardStatement(n: DiscardStatement): R | undefined {
    return
  }
  protected declarator(n: Declarator): R | undefined {
    this.visit(n.arraySpecifier)
    this.visit(n.init)
    return
  }
  protected doWhileStatement(n: DoWhileStatement): R | undefined {
    this.visit(n.statement)
    this.visit(n.conditionExpression)
    return
  }
  protected whileStatement(n: WhileStatement): R | undefined {
    this.visit(n.conditionExpression)
    this.visit(n.statement)
    return
  }
  protected forStatement(n: ForStatement): R | undefined {
    this.visit(n.initExpression)
    this.visit(n.conditionExpression)
    this.visit(n.loopExpression)
    this.visit(n.statement)
    return
  }
  protected expressionStatement(n: ExpressionStatement): R | undefined {
    this.visit(n.expression)
    return
  }
  protected initDeclaratorListDeclaration(
    n: InitDeclaratorListDeclaration,
  ): R | undefined {
    this.visit(n.fsType)
    n.declarators.forEach((d) => this.visit(d))
    return
  }
  protected precisionDeclaration(n: PrecisionDeclaration): R | undefined {
    this.visit(n.typeSpecifierNoPrec)
    return
  }
  protected selectionStatement(n: SelectionStatement): R | undefined {
    this.visit(n.condition)
    this.visit(n.yes)
    this.visit(n.no)
    return
  }
  protected storageQualifier(_n: StorageQualifier): R | undefined {
    return
  }
  protected switchStatement(n: SwitchStatement): R | undefined {
    this.visit(n.initExpression)
    this.visit(n.body)
    return
  }
  protected caseLabel(n: CaseLabel): R | undefined {
    this.visit(n._case)
    return
  }
  protected fullySpecifiedType(n: FullySpecifiedType): R | undefined {
    this.visit(n.typeQualifier)
    this.visit(n.typeSpecifier)
    return
  }
  protected typeQualifier(n: TypeQualifier): R | undefined {
    this.visit(n.storageQualifier)
    this.visit(n.layoutQualifier)
    return
  }
  protected structSpecifier(n: StructSpecifier): R | undefined {
    n.declarations.forEach((d) => this.visit(d))
    return
  }
  protected layoutQualifier(_n: LayoutQualifier): R | undefined {
    return
  }
  protected invariantDeclaration(_n: InvariantDeclaration): R | undefined {
    return
  }
  protected structDeclaration(n: StructDeclaration): R | undefined {
    this.visit(n.fsType)
    n.declarators.forEach((d) => this.visit(d))
    return
  }
  protected variableExpression(_n: VariableExpression): R | undefined {
    return
  }
  protected constantExpression(_n: ConstantExpression): R | undefined {
    return
  }
  protected uniformBlock(n: UniformBlock): R | undefined {
    n.declarations?.forEach((d) => this.visit(d))
    this.visit(n.arraySpecifier)
    return
  }
}
