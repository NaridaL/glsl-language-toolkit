import { IToken } from "chevrotain"

export interface Token extends IToken {
  macroSource?: Token
  // Line number, as parsed from input with applied line continuations.
  // Needed by preprocessor to figure out which tokens are in one line.
  lineNoCont?: number
}

export function getTokenStartLine(token: Token): number {
  return token.lineNoCont !== undefined ? token.lineNoCont : token.startLine!
}

export interface BaseNode {
  kind: string
  firstToken?: Token
  lastToken?: Token
  tokens?: Token[]
}

// need interface for interface merging
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BaseExpressionNode extends BaseNode {}

export interface ArraySpecifier extends BaseNode {
  kind: "arraySpecifier"
  size: Expression | undefined
}

export interface ArrayAccess extends BaseExpressionNode {
  kind: "arrayAccess"
  on: Expression
  index: Expression
}

export interface AssignmentExpression extends BaseExpressionNode {
  kind: "assignmentExpression"
  op: Token
  lhs: Expression
  rhs: Expression
}

export interface BinaryExpression extends BaseExpressionNode {
  kind: "binaryExpression"
  lhs: Expression
  rhs: Expression
  op: Token
}

export interface CommaExpression extends BaseExpressionNode {
  kind: "commaExpression"
  lhs: Expression
  rhs: Expression
}

export interface ConditionalExpression extends BaseExpressionNode {
  kind: "conditionalExpression"
  condition: Expression
  yes: Expression
  no: Expression
}

export interface ConstantExpression extends BaseExpressionNode {
  kind: "constantExpression"
  const_: Token
}

export interface FieldAccess extends BaseExpressionNode {
  kind: "fieldAccess"
  on: Expression
  field: Token
}

export interface FunctionCall extends BaseExpressionNode {
  kind: "functionCall"
  callee: TypeSpecifier
  args: Expression[]
}

export interface MethodCall extends BaseExpressionNode {
  kind: "methodCall"
  on: Expression
  functionCall: FunctionCall
}

export interface PostfixExpression extends BaseExpressionNode {
  kind: "postfixExpression"
  on: Expression
  op: Token
}

export interface UnaryExpression extends BaseExpressionNode {
  kind: "unaryExpression"
  on: Expression
  op: Token
}

export interface VariableExpression extends BaseExpressionNode {
  kind: "variableExpression"
  var: Token
}

export interface TranslationUnit extends BaseNode {
  kind: "translationUnit"
  declarations: Declaration[]
  comments?: Token[]
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
  // TOKEN.CONST
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
  // initExpression includes semicolon for parsing reasons.
  initExpression: Statement
  conditionExpression: Expression | InitDeclaratorListDeclaration | undefined
  loopExpression: Expression | undefined
  statement: Statement
}

export interface ExpressionStatement extends BaseNode {
  kind: "expressionStatement"
  // optional, is could be a simple semicolon statement
  expression: Expression | undefined
}

export interface UniformBlock extends BaseNode {
  kind: "uniformBlock"
  typeQualifier: TypeQualifier
  blockName: Token
  declarations: StructDeclaration[]
  namespace: Token | undefined
  arraySpecifier: ArraySpecifier | undefined
}

export type Expression =
  | ArrayAccess
  | AssignmentExpression
  | BinaryExpression
  | CommaExpression
  | ConditionalExpression
  | ConstantExpression
  | FieldAccess
  | FunctionCall
  | MethodCall
  | PostfixExpression
  | UnaryExpression
  | VariableExpression

export function isExpression(n: Node): n is Expression {
  return [
    "arrayAccess",
    "assignmentExpression",
    "binaryExpression",
    "commaExpression",
    "conditionalExpression",
    "constantExpression",
    "fieldAccess",
    "functionCall",
    "methodCall",
    "postfixExpression",
    "unaryExpression",
    "variableExpression",
  ].includes(n.kind)
}

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
  // Actually from OpenGL ES 1.00
  VARYING: Token | undefined
  // Actually from OpenGL ES 1.00
  ATTRIBUTE: Token | undefined
  CONST: Token | undefined
  UNIFORM: Token | undefined
}

export interface SwitchStatement extends BaseNode {
  kind: "switchStatement"
  initExpression: Expression
  cases: CaseBlock[]
}

export interface CaseLabel extends BaseNode {
  kind: "caseLabel"
  case_: Expression | undefined
}

export interface CaseBlock extends BaseNode {
  kind: "caseBlock"
  caseLabel: CaseLabel
  statements: Statement[]
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
  // token of type INVARIANT
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

export interface TypeQualifierDeclaration extends BaseNode {
  kind: "typeQualifierDeclaration"
  typeQualifier: TypeQualifier
}

export interface StructDeclaration extends BaseNode {
  kind: "structDeclaration"
  fsType: FullySpecifiedType
  declarators: Declarator[]
}

export interface PpDefine extends BaseNode {
  kind: "ppDefine"
  what: Token
  // params if this a function macro
  params: Token[] | undefined
  tokens: Token[]
  // node if we successfully parsed one
  node: Node | undefined
}

export interface PpExtension extends BaseNode {
  kind: "ppExtension"
  extension: Token
  behavior: Token
}

export interface PpDir extends BaseNode {
  kind: "ppDir"
  dir: Token
  tokens: Token[]
  // node if we successfully parsed one
  node: Node | undefined
}

export interface PpPragma extends BaseNode {
  kind: "ppPragma"
  dir: Token
}

export interface PpCall extends BaseNode {
  kind: "ppCall"
  callee: Token
  args: { tokens: Token[]; node: Node | undefined }[]
}

export interface PpInclude extends BaseNode {
  kind: "ppInclude"
  // eg. '"file.glsl"' or '<common>'
  what: string
}

export type PpNode =
  | PpDefine
  | PpDir
  | PpExtension
  | PpCall
  | PpPragma
  | PpInclude

export type Declaration =
  | FunctionDefinition
  | FunctionPrototype
  | InitDeclaratorListDeclaration
  | PrecisionDeclaration
  | InvariantDeclaration
  | TypeQualifierDeclaration
  | UniformBlock
  | PpNode
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
  | PpNode
export type Node =
  | ArraySpecifier
  | CaseBlock
  | Declaration
  | Declarator
  | Expression
  | FullySpecifiedType
  | LayoutQualifier
  | ParameterDeclaration
  | PpNode
  | Statement
  | StorageQualifier
  | StructDeclaration
  | StructSpecifier
  | TranslationUnit
  | TypeQualifier
  | TypeSpecifier

export class AbstractVisitor<R> {
  protected visit(n: Node | undefined): R | undefined {
    return n && (this[n.kind] as (n: Node) => R | undefined)(n)
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
    for (const a of n.args) {
      this.visit(a)
    }
    return
  }

  protected arrayAccess(n: ArrayAccess): R | undefined {
    this.visit(n.on)
    this.visit(n.index)
    return
  }

  protected translationUnit(n: TranslationUnit): R | undefined {
    for (const d of n.declarations) {
      this.visit(d)
    }
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
    for (const p of n.params) {
      this.visit(p)
    }
    this.visit(n.body)
    return
  }

  protected functionPrototype(n: FunctionPrototype): R | undefined {
    this.visit(n.returnType)
    for (const p of n.params) {
      this.visit(p)
    }
    return
  }

  protected parameterDeclaration(n: ParameterDeclaration): R | undefined {
    this.visit(n.arraySpecifier)
    this.visit(n.typeSpecifier)
    return
  }

  protected typeSpecifier(n: TypeSpecifier): R | undefined {
    if (isNode(n.typeSpecifierNonArray)) {
      this.visit(n.typeSpecifierNonArray)
    }
    this.visit(n.arraySpecifier)
    return
  }

  protected compoundStatement(n: CompoundStatement): R | undefined {
    for (const n1 of n.statements) {
      this.visit(n1)
    }
    return
  }

  protected returnStatement(n: ReturnStatement): R | undefined {
    this.visit(n.what)
    return
  }

  protected continueStatement(_n: ContinueStatement): R | undefined {
    return
  }

  protected breakStatement(_n: BreakStatement): R | undefined {
    return
  }

  protected discardStatement(_n: DiscardStatement): R | undefined {
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
    for (const d of n.declarators) {
      this.visit(d)
    }
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
    for (const c of n.cases) {
      this.visit(c)
    }
    return
  }

  protected caseLabel(n: CaseLabel): R | undefined {
    this.visit(n.case_)
    return
  }

  protected caseBlock(n: CaseBlock): R | undefined {
    this.visit(n.caseLabel)
    for (const s of n.statements) {
      this.visit(s)
    }
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
    for (const d of n.declarations) {
      this.visit(d)
    }
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
    for (const d of n.declarators) {
      this.visit(d)
    }
    return
  }

  protected variableExpression(_n: VariableExpression): R | undefined {
    return
  }

  protected constantExpression(_n: ConstantExpression): R | undefined {
    return
  }

  protected uniformBlock(n: UniformBlock): R | undefined {
    this.visit(n.typeQualifier)
    for (const d of n.declarations) {
      this.visit(d)
    }
    this.visit(n.arraySpecifier)
    return
  }

  protected ppDefine(n: PpDefine): R | undefined {
    this.visit(n.node)
    return
  }

  protected ppDir(_n: PpDir): R | undefined {
    return
  }

  protected ppExtension(_n: PpExtension): R | undefined {
    return
  }

  protected ppCall(_n: PpCall): R | undefined {
    return
  }

  protected ppPragma(_n: PpCall): R | undefined {
    return
  }
}

export function isToken(x: IToken | Node): x is IToken {
  return "tokenType" in x
}

export function isNode(x: Token | Node): x is Node {
  return "kind" in x
}

function lessEqual(line1: number, char1: number, line2: number, char2: number) {
  return line1 < line2 || (line1 === line2 && char1 <= char2)
}

function nodeIncludes(node: Node, line: number, char: number) {
  return (
    node.firstToken &&
    node.lastToken &&
    lessEqual(
      node.firstToken.startLine!,
      node.firstToken.startColumn!,
      line,
      char,
    ) &&
    lessEqual(line, char, node.lastToken.endLine!, node.lastToken.endColumn!)
  )
}

class FindNodeVisitor extends AbstractVisitor<Node> {
  private line = 0
  private col = 0
  private result: Node | undefined
  private path!: Node[]

  public findNodeByLineCol(
    tree: Node,
    line: number,
    col: number,
  ): [result: Node | undefined, path: Node[]] {
    this.line = line
    this.col = col
    this.result = undefined
    this.path = []
    this.visit(tree)
    return [this.result, this.path]
  }

  protected visit(n: Node | undefined): Node | undefined {
    if (n && nodeIncludes(n, this.line, this.col)) {
      this.path.push(n)
      this.result = n
      super.visit(n)
    }
    return undefined
  }
}

export function findPositionNode(
  tree: Node,
  line: number,
  char: number,
): [result: Node | undefined, path: Node[]] {
  return new FindNodeVisitor().findNodeByLineCol(tree, line, char)
}
