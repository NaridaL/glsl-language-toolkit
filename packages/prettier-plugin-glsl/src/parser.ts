/* eslint-disable @typescript-eslint/member-ordering */
import {
  EmbeddedActionsParser,
  EOF,
  ILexingResult,
  IRecognitionException,
  IRuleConfig,
  IToken,
  TokenType,
} from "chevrotain"

import {
  ArraySpecifier,
  CaseBlock,
  CaseLabel,
  CompoundStatement,
  Declaration,
  Declarator,
  DoWhileStatement,
  Expression,
  ExpressionStatement,
  ForStatement,
  FullySpecifiedType,
  FunctionCall,
  FunctionDefinition,
  FunctionPrototype,
  getTokenStartLine,
  InitDeclaratorListDeclaration,
  isNode,
  isToken,
  IterationStatement,
  JumpStatement,
  LayoutQualifier,
  Node,
  ParameterDeclaration,
  PpCall,
  PpDefine,
  PpDir,
  PpExtension,
  PpInclude,
  PpNode,
  PpPragma,
  PrecisionDeclaration,
  SelectionStatement,
  Statement,
  StorageQualifier,
  StructDeclaration,
  StructSpecifier,
  SwitchStatement,
  Token,
  TranslationUnit,
  TypeQualifier,
  TypeQualifierDeclaration,
  TypeSpecifier,
  UnaryExpression,
  UniformBlock,
  WhileStatement,
} from "./nodes"
import {
  ALL_TOKENS,
  checkLexingErrors,
  GLSL_LEXER,
  RESERVED_KEYWORDS,
  TOKEN,
} from "./lexer"
import { DEV, ExpandedLocation, substrContext } from "./util"
import { applyLineContinuations, fixLocations } from "./preprocessor"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VERSION_REGEXP = /\s*#\s*version\s+(\d+)\s+es\s*/

// NB: There are actually some ambiguities which this parser can't resolve, e.g.
// "i;" in a function could either be an expressionStatement containing a
// variableExpression or an initDeclaratorList of type "struct i" with no
// declarations. As neither of these is a useful construct, we always parse

// ambiguous declarations/statements as TODO.
class GLSLParser extends EmbeddedActionsParser {
  //SPEC variable_identifier:
  //SPEC     IDENTIFIER
  //SPEC primary_expression:
  //SPEC     variable_identifier
  //SPEC     INTCONSTANT
  //SPEC     UINTCONSTANT
  //SPEC     FLOATCONSTANT
  //SPEC     BOOLCONSTANT
  //SPEC     LEFT_PAREN expression RIGHT_PAREN
  //SPEC postfix_expression:
  //SPEC     primary_expression
  //SPEC     postfix_expression LEFT_BRACKET integer_expression RIGHT_BRACKET
  //SPEC     function_call
  //SPEC     postfix_expression DOT FIELD_SELECTION
  //SPEC     postfix_expression INC_OP
  //SPEC     postfix_expression DEC_OP
  //SPEC integer_expression:
  //SPEC     expression
  //SPEC function_call:
  //SPEC     function_call_or_method
  //SPEC function_call_or_method:
  //SPEC     function_call_generic
  //SPEC     postfix_expression DOT function_call_generic
  //SPEC function_call_generic:
  //SPEC     function_call_header_with_parameters RIGHT_PAREN
  //SPEC     function_call_header_no_parameters RIGHT_PAREN
  //SPEC function_call_header_no_parameters:
  //SPEC     function_call_header VOID
  //SPEC     function_call_header
  //SPEC function_call_header_with_parameters:
  //SPEC     function_call_header assignment_expression
  //SPEC     function_call_header_with_parameters COMMA assignment_expression
  //SPEC function_call_header:
  //SPEC     function_identifier LEFT_PAREN
  //SPEC // Grammar Note: Constructors look like functions, but lexical analysis recognized most of them as
  //SPEC     // keywords. They are now recognized through “type_specifier”.
  //SPEC     // Methods (.length) and identifiers are recognized through postfix_expression.
  //SPEC function_identifier:
  //SPEC     type_specifier
  //SPEC     IDENTIFIER
  //SPEC     FIELD_SELECTION
  //SPEC unary_expression:
  //SPEC     postfix_expression
  //SPEC     INC_OP unary_expression
  //SPEC     DEC_OP unary_expression
  //SPEC     multiplicative_expression PERCENT unary_expression
  public multiplicativeExpression = this.RR(
    "multiplicativeExpression",
    (): Expression =>
      this.LEFT_ASSOC(
        // this.unaryExpression,
        this.preprocessing ? this.ppUnaryExpression : this.unaryExpression,
        TOKEN.MULTIPLICATIVE_OP,
      ),
  )
  //SPEC // Grammar Note: No traditional style type casts.
  //SPEC unary_operator:
  //SPEC     PLUS
  //SPEC     DASH
  //SPEC     BANG
  //SPEC     TILDE
  //SPEC // Grammar Note: No '*' or '&' unary ops. Pointers are not supported.
  //SPEC multiplicative_expression:
  //SPEC     unary_expression
  //SPEC     multiplicative_expression STAR unary_expression
  //SPEC     multiplicative_expression SLASH unary_expression
  //SPEC     additive_expression DASH multiplicative_expression
  public additiveExpression = this.RR(
    "additiveExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.multiplicativeExpression, TOKEN.ADDITIVE_OP),
  )
  //SPEC additive_expression:
  //SPEC     multiplicative_expression
  //SPEC     additive_expression PLUS multiplicative_expression
  //SPEC     shift_expression RIGHT_OP additive_expression
  public shiftExpression = this.RR(
    "shiftExpression",
    (): Expression => this.LEFT_ASSOC(this.additiveExpression, TOKEN.SHIFT_OP),
  )
  //SPEC shift_expression:
  //SPEC     additive_expression
  //SPEC     shift_expression LEFT_OP additive_expression
  //SPEC     relational_expression GE_OP shift_expression
  public relationalExpression = this.RR(
    "relationalExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.shiftExpression, TOKEN.RELATIONAL_OP),
  )
  //SPEC relational_expression:
  //SPEC     shift_expression
  //SPEC     relational_expression LEFT_ANGLE shift_expression
  //SPEC     relational_expression RIGHT_ANGLE shift_expression
  //SPEC     relational_expression LE_OP shift_expression
  //SPEC     equality_expression NE_OP relational_expression
  public equalityExpression = this.RR(
    "equalityExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.relationalExpression, TOKEN.EQUALITY_OP),
  )
  //SPEC equality_expression:
  //SPEC     relational_expression
  //SPEC     equality_expression EQ_OP relational_expression
  //SPEC     and_expression AMPERSAND equality_expression
  public andExpression = this.RR(
    "andExpression",
    (): Expression => this.LEFT_ASSOC(this.equalityExpression, TOKEN.AMPERSAND),
  )
  //SPEC and_expression:
  //SPEC     equality_expression
  //SPEC     exclusive_or_expression CARET and_expression
  public exclusiveOrExpression = this.RR(
    "exclusiveOrExpression",
    (): Expression => this.LEFT_ASSOC(this.andExpression, TOKEN.CARET),
  )
  //SPEC exclusive_or_expression:
  //SPEC     and_expression
  //SPEC     inclusive_or_expression VERTICAL_BAR exclusive_or_expression
  public inclusiveOrExpression = this.RR(
    "inclusiveOrExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.exclusiveOrExpression, TOKEN.VERTICAL_BAR),
  )
  //SPEC inclusive_or_expression:
  //SPEC     exclusive_or_expression
  //SPEC     logical_and_expression AND_OP inclusive_or_expression
  public logicalAndExpression = this.RR(
    "logicalAndExpression",
    (): Expression => this.LEFT_ASSOC(this.inclusiveOrExpression, TOKEN.AND_OP),
  )
  //SPEC logical_and_expression:
  //SPEC     inclusive_or_expression
  //SPEC     logical_xor_expression XOR_OP logical_and_expression
  public logicalXorExpression = this.RR(
    "logicalXorExpression",
    (): Expression => this.LEFT_ASSOC(this.logicalAndExpression, TOKEN.XOR_OP),
  )
  //SPEC logical_xor_expression:
  //SPEC     logical_and_expression
  //SPEC     logical_or_expression OR_OP logical_xor_expression
  public logicalOrExpression = this.RR(
    "logicalOrExpression",
    (): Expression => this.LEFT_ASSOC(this.logicalXorExpression, TOKEN.OR_OP),
  )
  //SPEC logical_or_expression:
  //SPEC     logical_xor_expression
  //SPEC     OR_ASSIGN
  public assignmentExpression = this.RR(
    "assignmentExpression",
    (): Expression => {
      // unary expression on lhs leads to ambiguities when parsing
      // (conditionalExpression starts with unaryExpression), instead use
      // assignmentExpression: conditionalExpression (assignmentOperator conditionalExpression)*
      // and do semantic check later.

      // right-associative
      const result = this.SUBRULE(this.conditionalExpression)
      return (
        this.OPTION(() => {
          const op = this.CONSUME(TOKEN.ASSIGN_OP)
          const rhs = this.SUBRULE1(this.assignmentExpression)
          return { kind: "assignmentExpression", lhs: result, op, rhs }
        }) ?? result
      )
    },
  )
  //SPEC conditional_expression:
  //SPEC     logical_or_expression
  public expression = this.RR("expression", (): Expression => {
    let result!: Expression
    this.AT_LEAST_ONE_SEP({
      SEP: TOKEN.COMMA,
      DEF: () => {
        const rhs = this.SUBRULE(this.assignmentExpression)
        return (result = !result
          ? rhs
          : { kind: "commaExpression", lhs: result, rhs })
      },
    })
    return result
  })
  //SPEC assignment_expression:
  //SPEC     conditional_expression
  //SPEC     unary_expression assignment_operator assignment_expression
  //SPEC assignment_operator:
  //SPEC     EQUAL
  //SPEC     MUL_ASSIGN
  //SPEC     DIV_ASSIGN
  //SPEC     MOD_ASSIGN
  //SPEC     ADD_ASSIGN
  //SPEC     SUB_ASSIGN
  //SPEC     LEFT_ASSIGN
  //SPEC     RIGHT_ASSIGN
  //SPEC     AND_ASSIGN
  //SPEC     XOR_ASSIGN
  //SPEC     logical_or_expression QUESTION expression COLON assignment_expression
  public conditionalExpression = this.RR(
    "conditionalExpression",
    (): Expression => {
      const result = this.SUBRULE1(this.logicalOrExpression)

      return (
        this.OPTION(() => ({
          kind: "conditionalExpression",
          condition: result,
          QUESTION: this.CONSUME(TOKEN.QUESTION),
          yes: this.SUBRULE2(this.expression),
          COLON: this.CONSUME(TOKEN.COLON),
          no: this.SUBRULE3(this.assignmentExpression),
        })) ?? result
      )
    },
  )
  //SPEC expression:
  //SPEC     assignment_expression
  //SPEC     expression COMMA assignment_expression
  //SPEC constant_expression:
  //SPEC     conditional_expression
  //SPEC declaration:
  //SPEC     function_prototype SEMICOLON
  //SPEC     init_declarator_list SEMICOLON
  //SPEC     PRECISION precision_qualifier type_specifier_no_prec SEMICOLON
  //SPEC     type_qualifier IDENTIFIER LEFT_BRACE struct_declaration_list RIGHT_BRACE SEMICOLON
  //SPEC     type_qualifier IDENTIFIER LEFT_BRACE struct_declaration_list RIGHT_BRACE
  //SPEC     IDENTIFIER SEMICOLON
  //SPEC     type_qualifier IDENTIFIER LEFT_BRACE struct_declaration_list RIGHT_BRACE
  //SPEC     IDENTIFIER LEFT_BRACKET constant_expression RIGHT_BRACKET SEMICOLON
  //SPEC     type_qualifier SEMICOLON
  //SPEC function_prototype:
  //SPEC     function_declarator RIGHT_PAREN
  //SPEC function_declarator:
  //SPEC     function_header
  //SPEC     function_header_with_parameters
  //SPEC function_header_with_parameters:
  //SPEC     function_header parameter_declaration
  //SPEC     function_header_with_parameters COMMA parameter_declaration
  //SPEC function_header:
  //SPEC     fully_specified_type IDENTIFIER LEFT_PAREN
  //SPEC parameter_declarator:
  //SPEC     type_specifier IDENTIFIER
  //SPEC     type_specifier IDENTIFIER LEFT_BRACKET constant_expression RIGHT_BRACKET
  //SPEC parameter_declaration:
  //SPEC     parameter_type_qualifier parameter_qualifier parameter_declarator
  //SPEC     parameter_qualifier parameter_declarator
  //SPEC     parameter_type_qualifier parameter_qualifier parameter_type_specifier
  //SPEC     parameter_qualifier parameter_type_specifier
  //SPEC parameter_qualifier:
  //SPEC     /* empty */
  //SPEC     IN
  //SPEC     OUT
  //SPEC     INOUT
  //SPEC parameter_type_specifier:
  //SPEC     statement_list
  // public switchStatement = this.RR("switchStatement", (): SwitchStatement => {
  //   this.CONSUME(TOKEN.SWITCH)
  //   this.CONSUME(TOKEN.LEFT_PAREN)
  //   const initExpression = this.SUBRULE(this.expression)
  //   this.CONSUME(TOKEN.RIGHT_PAREN)
  //   const body = this.SUBRULE(this.compoundStatement, { ARGS: [true] })
  //   return { kind: "switchStatement", initExpression, body }
  // })
  public switchStatement = this.RR("switchStatement", (): SwitchStatement => {
    this.CONSUME(TOKEN.SWITCH)
    this.CONSUME(TOKEN.LEFT_PAREN)
    const initExpression = this.SUBRULE(this.expression)
    this.CONSUME(TOKEN.RIGHT_PAREN)
    this.CONSUME(TOKEN.LEFT_BRACE)
    const cases: CaseBlock[] = []
    this.MANY(() => cases.push(this.SUBRULE(this.caseBlock)))
    this.CONSUME(TOKEN.RIGHT_BRACE)

    return { kind: "switchStatement", initExpression, cases }
  })
  public caseBlock = this.RR("caseBlock", (): CaseBlock => {
    const caseLabel = this.SUBRULE(this.caseLabel)
    const statements: Statement[] = []
    this.MANY1(() => statements.push(this.SUBRULE(this.statement)))
    return { kind: "caseBlock", caseLabel, statements }
  })
  //SPEC init_declarator_list:
  //SPEC     single_declaration
  //SPEC     init_declarator_list COMMA IDENTIFIER
  //SPEC     init_declarator_list COMMA IDENTIFIER LEFT_BRACKET constant_expression
  //SPEC     RIGHT_BRACKET
  //SPEC     init_declarator_list COMMA IDENTIFIER LEFT_BRACKET
  //SPEC     RIGHT_BRACKET EQUAL initializer
  //SPEC     init_declarator_list COMMA IDENTIFIER LEFT_BRACKET constant_expression
  //SPEC     RIGHT_BRACKET EQUAL initializer
  //SPEC     init_declarator_list COMMA IDENTIFIER EQUAL initializer
  //SPEC single_declaration:
  //SPEC     fully_specified_type
  //SPEC     fully_specified_type IDENTIFIER
  //SPEC     fully_specified_type IDENTIFIER LEFT_BRACKET constant_expression RIGHT_BRACKET
  //SPEC     fully_specified_type IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
  //SPEC     fully_specified_type IDENTIFIER LEFT_BRACKET constant_expression
  //SPEC     RIGHT_BRACKET EQUAL initializer
  //SPEC     fully_specified_type IDENTIFIER EQUAL initializer
  //SPEC     INVARIANT IDENTIFIER
  //SPEC // Grammar Note: No 'enum', or 'typedef'.
  //SPEC fully_specified_type:
  //SPEC     type_specifier
  //SPEC     type_qualifier type_specifier
  //SPEC invariant_qualifier:
  //SPEC     INVARIANT
  //SPEC interpolation_qualifier:
  //SPEC     SMOOTH
  //SPEC     FLAT
  //SPEC layout_qualifier:
  //SPEC     LAYOUT LEFT_PAREN layout_qualifier_id_list RIGHT_PAREN
  //SPEC layout_qualifier_id_list:
  //SPEC     layout_qualifier_id
  //SPEC     layout_qualifier_id_list COMMA layout_qualifier_id
  //SPEC layout_qualifier_id:
  //SPEC     IDENTIFIER
  //SPEC     IDENTIFIER EQUAL INTCONSTANT
  //SPEC     IDENTIFIER EQUAL UINTCONSTANT
  //SPEC parameter_type_qualifier:
  //SPEC     CONST
  //SPEC type_qualifier:
  //SPEC     storage_qualifier
  //SPEC     layout_qualifier
  //SPEC     layout_qualifier storage_qualifier
  //SPEC     interpolation_qualifier storage_qualifier
  //SPEC     interpolation_qualifier
  //SPEC     invariant_qualifier storage_qualifier
  //SPEC // Grammar Note: No 'goto'. Gotos are not supported.
  public jumpStatement = this.RR("jumpStatement", (): JumpStatement => {
    const result: JumpStatement = this.OR([
      {
        ALT: () => {
          this.CONSUME(TOKEN.CONTINUE)
          return { kind: "continueStatement" }
        },
      },
      {
        ALT: () => {
          this.CONSUME(TOKEN.BREAK)
          return { kind: "breakStatement" }
        },
      },
      {
        ALT: () => {
          this.CONSUME(TOKEN.DISCARD)
          return { kind: "discardStatement" }
        },
      },
      {
        ALT: () => {
          this.CONSUME(TOKEN.RETURN)
          const what = this.OPTION(() => this.SUBRULE(this.expression))
          return { kind: "returnStatement", what }
        },
      },
    ])
    this.CONSUME(TOKEN.SEMICOLON)
    return result
  })
  //SPEC storage_qualifier:
  //SPEC     CONST
  //SPEC     IN
  //SPEC     OUT
  //SPEC     CENTROID IN
  //SPEC     CENTROID OUT
  //SPEC     UNIFORM
  //SPEC type_specifier:
  //SPEC     type_specifier_no_prec
  //SPEC     precision_qualifier type_specifier_no_prec
  //SPEC type_specifier_no_prec:
  //SPEC     type_specifier_nonarray
  //SPEC     type_specifier_nonarray LEFT_BRACKET RIGHT_BRACKET
  public primaryExpression = this.RR(
    "primaryExpression",
    (): Expression =>
      this.OR<Expression>([
        {
          ALT: () => {
            this.CONSUME(TOKEN.LEFT_PAREN)
            const result = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.RIGHT_PAREN)
            return result
          },
        },
        {
          ALT: () => ({
            kind: "variableExpression",
            var: this.CONSUME(TOKEN.IDENTIFIER),
          }),
        },
        {
          ALT: () => ({
            kind: "constantExpression",
            const_: this.CONSUME(TOKEN.CONSTANT),
          }),
        },
      ]),
  )
  //SPEC type_specifier_nonarray:
  //SPEC     VOID
  //SPEC     FLOAT
  //SPEC     INT
  //SPEC     UINT
  //SPEC     BOOL
  //SPEC     VEC2
  //SPEC     VEC3
  //SPEC     VEC4
  //SPEC     BVEC2
  //SPEC     BVEC3
  //SPEC     BVEC4
  //SPEC     IVEC2
  //SPEC     IVEC3
  //SPEC     IVEC4
  //SPEC     UVEC2
  //SPEC     UVEC3
  //SPEC     UVEC4
  //SPEC     MAT2
  //SPEC     MAT3
  //SPEC     MAT4
  //SPEC     MAT2X2
  //SPEC     MAT2X3
  //SPEC     MAT2X4
  //SPEC     MAT3X2
  //SPEC     MAT3X3
  //SPEC     MAT3X4
  //SPEC     MAT4X2
  //SPEC     MAT4X3
  //SPEC     MAT4X4
  //SPEC     SAMPLER2D
  //SPEC     SAMPLER3D
  //SPEC     SAMPLERCUBE
  //SPEC     SAMPLER2DSHADOW
  //SPEC     SAMPLERCUBESHADOW
  //SPEC     SAMPLER2DARRAY
  //SPEC     SAMPLER2DARRAYSHADOW
  //SPEC     ISAMPLER2D
  //SPEC     ISAMPLER3D
  //SPEC     ISAMPLERCUBE
  //SPEC     ISAMPLER2DARRAY
  //SPEC     USAMPLER2D
  //SPEC     USAMPLER3D
  //SPEC     USAMPLERCUBE
  //SPEC     USAMPLER2DARRAY
  //SPEC     struct_specifier
  //SPEC     TYPE_NAME
  //SPEC precision_qualifier:
  //SPEC     HIGH_PRECISION
  //SPEC     MEDIUM_PRECISION
  //SPEC     LOW_PRECISION
  //SPEC struct_specifier:
  //SPEC     STRUCT IDENTIFIER LEFT_BRACE struct_declaration_list RIGHT_BRACE
  //SPEC     STRUCT LEFT_BRACE struct_declaration_list RIGHT_BRACE
  //SPEC struct_declaration_list:
  //SPEC     struct_declaration
  //SPEC     struct_declaration_list struct_declaration
  //SPEC struct_declaration:
  //SPEC     type_specifier struct_declarator_list SEMICOLON
  //SPEC     type_qualifier type_specifier struct_declarator_list SEMICOLON
  //SPEC struct_declarator_list:
  //SPEC     struct_declarator
  //SPEC     struct_declarator_list COMMA struct_declarator
  //SPEC struct_declarator:
  //SPEC     IDENTIFIER
  //SPEC     IDENTIFIER LEFT_BRACKET RIGHT_BRACKET
  //SPEC     IDENTIFIER LEFT_BRACKET constant_expression RIGHT_BRACKET
  //SPEC initializer:
  //SPEC     assignment_expression
  //SPEC declaration_statement:
  //SPEC     declaration
  //SPEC statement:
  //SPEC     compound_statement_with_scope
  //SPEC     simple_statement
  //SPEC statement_no_new_scope:
  //SPEC     compound_statement_no_new_scope
  //SPEC     simple_statement
  //SPEC statement_with_scope:
  //SPEC     compound_statement_no_new_scope
  //SPEC     simple_statement
  //SPEC // Grammar Note: labeled statements for SWITCH only; 'goto' is not supported.
  //SPEC simple_statement:
  //SPEC     declaration_statement
  //SPEC     expression_statement
  //SPEC     selection_statement
  //SPEC     switch_statement
  //SPEC     case_label
  //SPEC     iteration_statement
  //SPEC     jump_statement
  //SPEC compound_statement_with_scope:
  //SPEC     LEFT_BRACE RIGHT_BRACE
  //SPEC     LEFT_BRACE statement_list RIGHT_BRACE
  //SPEC compound_statement_no_new_scope:
  //SPEC     LEFT_BRACE RIGHT_BRACE
  //SPEC     LEFT_BRACE statement_list RIGHT_BRACE
  public constantExpression = this.RR(
    "constantExpression",
    (): Expression => this.SUBRULE(this.conditionalExpression),
  )
  //SPEC statement_list:
  //SPEC     statement
  //SPEC     statement_list statement
  //SPEC expression_statement:
  //SPEC     SEMICOLON
  //SPEC     expression SEMICOLON
  //SPEC selection_statement:
  //SPEC     IF LEFT_PAREN expression RIGHT_PAREN selection_rest_statement
  //SPEC selection_rest_statement:
  //SPEC     statement_with_scope ELSE statement_with_scope
  //SPEC     statement_with_scope
  //SPEC condition:
  //SPEC     expression
  //SPEC     fully_specified_type IDENTIFIER EQUAL initializer
  //SPEC switch_statement:
  //SPEC     SWITCH LEFT_PAREN expression RIGHT_PAREN LEFT_BRACE switch_statement_list
  //SPEC     RIGHT_BRACE
  //SPEC switch_statement_list:
  //SPEC     /* nothing */
  public layoutQualifier = this.RR("layoutQualifier", (): LayoutQualifier => {
    this.CONSUME(TOKEN.LAYOUT)
    this.CONSUME(TOKEN.LEFT_PAREN)
    const layoutQualifierIds: {
      IDENTIFIER: Token
      init: Token | undefined
    }[] = []
    this.AT_LEAST_ONE_SEP({
      SEP: TOKEN.COMMA,
      DEF: () => {
        const IDENTIFIER = this.CONSUME(TOKEN.IDENTIFIER)
        let init
        this.OPTION(() => {
          this.CONSUME(TOKEN.EQUAL)
          init = this.OR([
            { ALT: () => this.CONSUME(TOKEN.INTCONSTANT) },
            { ALT: () => this.CONSUME(TOKEN.UINTCONSTANT) },
          ])
        })
        layoutQualifierIds.push({ IDENTIFIER, init })
      },
    })
    this.CONSUME(TOKEN.RIGHT_PAREN)
    return { kind: "layoutQualifier", layoutQualifierIds }
  })

  //SPEC case_label:
  //SPEC     CASE expression COLON
  //SPEC     DEFAULT COLON
  //SPEC iteration_statement:
  //SPEC     WHILE LEFT_PAREN condition RIGHT_PAREN statement_no_new_scope
  //SPEC     DO statement_with_scope WHILE LEFT_PAREN expression RIGHT_PAREN SEMICOLON
  public storageQualifier = this.RR(
    "storageQualifier",
    (): StorageQualifier => {
      let CONST, CENTROID, IN, OUT, UNIFORM, VARYING, ATTRIBUTE
      this.OR([
        { ALT: () => (CONST = this.CONSUME(TOKEN.CONST)) },
        {
          ALT: () => {
            CENTROID = this.OPTION(() => this.CONSUME(TOKEN.CENTROID))
            this.OR9([
              { ALT: () => (IN = this.CONSUME(TOKEN.IN)) },
              { ALT: () => (OUT = this.CONSUME(TOKEN.OUT)) },
              { ALT: () => (VARYING = this.CONSUME(TOKEN.VARYING)) },
              { ALT: () => (ATTRIBUTE = this.CONSUME(TOKEN.ATTRIBUTE)) },
            ])
          },
        },
        { ALT: () => (UNIFORM = this.CONSUME(TOKEN.UNIFORM)) },
      ])
      return {
        kind: "storageQualifier",
        CONST,
        CENTROID,
        IN,
        OUT,
        VARYING,
        ATTRIBUTE,
        UNIFORM,
      }
    },
  )

  //SPEC for_init_statement:
  //SPEC     expression_statement
  //SPEC     declaration_statement
  //SPEC conditionopt:
  //SPEC     condition
  //SPEC     /* empty */
  //SPEC for_rest_statement:
  //SPEC     conditionopt SEMICOLON
  //SPEC     conditionopt SEMICOLON expression
  //SPEC jump_statement:
  //SPEC     CONTINUE SEMICOLON
  //SPEC     BREAK SEMICOLON
  //SPEC     RETURN SEMICOLON
  //SPEC     RETURN expression SEMICOLON
  //SPEC     DISCARD SEMICOLON // Fragment shader only.
  //SPEC     invariant_qualifier interpolation_qualifier storage_qualifier
  public typeQualifier = this.RR("typeQualifier", (): TypeQualifier => {
    let storageQualifier: StorageQualifier | undefined
    let layoutQualifier: LayoutQualifier | undefined
    let interpolationQualifier: Token | undefined
    let invariantQualifier: Token | undefined
    this.OR([
      {
        ALT: () => (storageQualifier = this.SUBRULE(this.storageQualifier)),
      },
      {
        ALT: () => {
          layoutQualifier = this.SUBRULE1(this.layoutQualifier)
          storageQualifier = this.OPTION1(() =>
            this.SUBRULE2(this.storageQualifier),
          )
        },
      },
      {
        ALT: () => {
          interpolationQualifier = this.CONSUME(TOKEN.INTERPOLATION_QUALIFIER)
          storageQualifier = this.OPTION2(() =>
            this.SUBRULE3(this.storageQualifier),
          )
        },
      },
      {
        ALT: () => {
          // this.SUBRULE(this.invariantQualifier)
          invariantQualifier = this.CONSUME(TOKEN.INVARIANT)
          interpolationQualifier = this.OPTION3(() =>
            this.CONSUME1(TOKEN.INTERPOLATION_QUALIFIER),
          )
          storageQualifier = this.SUBRULE7(this.storageQualifier)
        },
      },
    ])
    return {
      kind: "typeQualifier",
      storageQualifier,
      layoutQualifier,
      interpolationQualifier,
      invariantQualifier,
    }
  })

  //SPEC translation_unit:
  //SPEC     external_declaration
  //SPEC     translation_unit external_declaration
  //SPEC external_declaration:
  //SPEC     function_definition
  //SPEC     declaration
  //SPEC function_definition:
  //SPEC     function_prototype compound_statement_no_new_scope
  //SPEC     In general the above grammar describes a super set of the GLSL ES language. Certain constructs that are
  //SPEC     valid purely in terms of the grammar are disallowed by statements elsewhere in this specification.
  //SPEC     Rules specifying the scoping are present only to assist the understanding of scoping and they do not affect
  //SPEC     the language accepted by the grammar. If required, the grammar can be simplified by making the
  //SPEC following substitutions:
  //SPEC     •
  //SPEC
  //SPEC     Replace compound_statement_with_scope and compound_statement_no_new_scope with a new
  //SPEC     rule compound_statement
  //SPEC
  //SPEC     •
  //SPEC
  //SPEC     Replace statement_with_scope and statement_no_new_scope with the existing rule statement.
  public precisionQualifier = this.RR(
    "precisionQualifier",
    (): IToken => this.CONSUME(TOKEN.PRECISION_QUALIFIER),
  )
  // assignmentExpression: conditionalExpression (assignmentOperator conditionalExpression)*
  public arraySpecifier = this.RR("arraySpecifier", (): ArraySpecifier => {
    this.CONSUME(TOKEN.LEFT_BRACKET)
    const size = this.OPTION3(() => this.SUBRULE(this.constantExpression))
    this.CONSUME(TOKEN.RIGHT_BRACKET)
    return { kind: "arraySpecifier", size }
  })
  public typeSpecifierNonArray = this.RR(
    "typeSpecifierNonArray",
    (): IToken | StructSpecifier =>
      this.OR([
        { ALT: () => this.CONSUME(TOKEN.BASIC_TYPE) },
        { ALT: () => this.CONSUME(TOKEN.VOID) },
        { ALT: () => this.SUBRULE(this.structSpecifier) },
        { ALT: () => this.CONSUME(TOKEN.IDENTIFIER) },
      ]),
  )
  //SPEC     type_specifier_nonarray LEFT_BRACKET constant_expression RIGHT_BRACKET
  public typeSpecifierNoPrec = this.RR(
    "typeSpecifierNoPrec",
    (): TypeSpecifier => {
      const typeSpecifierNonArray = this.SUBRULE(this.typeSpecifierNonArray)
      const arraySpecifier = this.OPTION1(() =>
        this.SUBRULE(this.arraySpecifier),
      )
      return {
        kind: "typeSpecifier",
        precisionQualifier: undefined,
        arraySpecifier,
        typeSpecifierNonArray,
      }
    },
  )
  public functionCall = this.RR("functionCall", (): FunctionCall => {
    const callee = this.SUBRULE(this.typeSpecifierNoPrec)
    this.CONSUME(TOKEN.LEFT_PAREN)
    const args: Expression[] = []
    this.MANY_SEP({
      DEF: () => args.push(this.SUBRULE(this.assignmentExpression)),
      SEP: TOKEN.COMMA,
    })
    this.CONSUME(TOKEN.RIGHT_PAREN)
    return { kind: "functionCall", callee, args }
  })
  // used for lookahead
  public functionCallHeader = this.RULE("functionCallHeader", (): void => {
    this.SUBRULE(this.typeSpecifierNoPrec)
    this.CONSUME(TOKEN.LEFT_PAREN)
  })
  // We add postfixExpression DOT functionCall.
  public postfixExpression = this.RR("postfixExpression", (): Expression => {
    const firstToken = this.LA(1)
    let result = this.OR1([
      {
        GATE: this.BACKTRACK(this.functionCallHeader),
        ALT: () => this.SUBRULE1(this.functionCall),
      },
      {
        ALT: () => this.SUBRULE(this.primaryExpression),
      },
    ])
    this.MANY(() => {
      result = this.OR2([
        {
          ALT: () => {
            this.CONSUME(TOKEN.LEFT_BRACKET)
            const index = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.RIGHT_BRACKET)
            return { kind: "arrayAccess", on: result, index }
          },
        },
        {
          ALT: () => {
            this.CONSUME1(TOKEN.DOT)
            const functionCall = this.SUBRULE2(this.functionCall)
            return { kind: "methodCall", on: result, functionCall }
          },
        },
        {
          ALT: () => {
            this.CONSUME2(TOKEN.DOT)
            const field = this.CONSUME(TOKEN.IDENTIFIER)
            return { kind: "fieldAccess", on: result, field }
          },
        },
        {
          ALT: () => {
            const op = this.CONSUME(TOKEN.POSTFIX_OP)
            return { kind: "postfixExpression", on: result, op }
          },
        },
      ])
      this.FINALIZE(result, firstToken)
    })
    return result
  })
  //SPEC     unary_operator unary_expression
  public unaryExpression = this.RR(
    "unaryExpression",
    (): Expression =>
      this.OR([
        { ALT: () => this.SUBRULE1(this.postfixExpression) },
        {
          ALT: (): UnaryExpression => {
            const op = this.CONSUME(TOKEN.UNARY_OP)
            const on = this.SUBRULE2(this.unaryExpression)
            return { kind: "unaryExpression", op, on }
          },
        },
      ]),
  )
  public ppUnaryExpression = this.RR(
    "ppUnaryExpression",
    (): Expression =>
      this.OR([
        {
          GATE: () =>
            this.LA(1).tokenType === TOKEN.NON_PP_IDENTIFIER &&
            this.LA(1).image === "defined",
          ALT: () => {
            const op = this.CONSUME(TOKEN.IDENTIFIER)
            const _var = this.OR1([
              { ALT: () => this.SUBRULE(this.ppIdentifier) },
              {
                ALT: () => {
                  this.CONSUME(TOKEN.LEFT_PAREN)
                  const _var = this.SUBRULE1(this.ppIdentifier)
                  this.CONSUME(TOKEN.RIGHT_PAREN)
                  return _var
                },
              },
            ])
            return {
              kind: "unaryExpression",
              op,
              on: { kind: "variableExpression", var: _var },
            }
          },
        },
        {
          ALT: () => {
            const op = this.OR2([
              { ALT: () => this.CONSUME(TOKEN.PLUS) },
              { ALT: () => this.CONSUME(TOKEN.DASH) },
              { ALT: () => this.CONSUME(TOKEN.TILDE) },
              { ALT: () => this.CONSUME(TOKEN.BANG) },
            ])
            const on = this.SUBRULE2(this.ppUnaryExpression)
            return { kind: "unaryExpression", op, on }
          },
        },
        {
          ALT: () => this.SUBRULE(this.ppPrimaryExpression),
        },
      ]),
  )

  public ppPrimaryExpression = this.RR(
    "ppPrimaryExpression",
    (): Expression =>
      this.OR([
        {
          ALT: () => ({
            kind: "variableExpression",
            var: this.SUBRULE(this.ppIdentifier),
          }),
        },
        {
          ALT: () => ({
            kind: "constantExpression",
            const_: this.CONSUME(TOKEN.INTCONSTANT),
          }),
        },
        {
          ALT: () => {
            this.CONSUME(TOKEN.LEFT_PAREN)
            const expr = this.SUBRULE(this.ppConstantExpression)
            this.CONSUME(TOKEN.RIGHT_PAREN)
            return expr
          },
        },
      ]),
  )

  public ppConstantExpression = this.RR("ppConstantExpression", () => {
    try {
      this.preprocessing = true
      return this.LEFT_ASSOC(this.logicalAndExpression, TOKEN.OR_OP)
    } finally {
      this.preprocessing = false
    }
  })

  public typeSpecifier = this.RR("typeSpecifier", (): TypeSpecifier => {
    const precisionQualifier = this.OPTION(() =>
      this.SUBRULE(this.precisionQualifier),
    )
    const typeSpecifierNoPrec = this.SUBRULE(this.typeSpecifierNoPrec)
    return Object.assign({}, typeSpecifierNoPrec, { precisionQualifier })
  })
  //SPEC     type_specifier
  public parameterDeclaration = this.RR(
    "parameterDeclaration",
    (): ParameterDeclaration => {
      //     constQualifier
      const parameterTypeQualifier = this.OPTION(() =>
        this.CONSUME(TOKEN.CONST),
      )
      //     parameterQualifier
      const parameterQualifier = this.OPTION1(() =>
        this.CONSUME(TOKEN.PARAMETER_QUALIFIER),
      )

      const typeSpecifier = this.SUBRULE(this.typeSpecifier)
      let pName, arraySpecifier
      this.OPTION2(() => {
        pName = this.CONSUME2(TOKEN.IDENTIFIER)
        //arraySpecifier
        arraySpecifier = this.OPTION3(() => this.SUBRULE(this.arraySpecifier))
      })
      return {
        kind: "parameterDeclaration",
        parameterTypeQualifier,
        pName,
        arraySpecifier,
        parameterQualifier,
        typeSpecifier,
      }
    },
  )
  public fullySpecifiedType = this.RR(
    "fullySpecifiedType",
    (): FullySpecifiedType => {
      const typeQualifier = this.OPTION(() => this.SUBRULE(this.typeQualifier))
      const typeSpecifier = this.SUBRULE(this.typeSpecifier)
      return { kind: "fullySpecifiedType", typeQualifier, typeSpecifier }
    },
  )
  public structDeclaration = this.RR(
    "structDeclaration",
    (): StructDeclaration => {
      const fsType = this.SUBRULE(this.fullySpecifiedType)
      const declarators: Declarator[] = []
      this.MANY_SEP({
        SEP: TOKEN.COMMA,
        DEF: this.ANNOTATE(() => {
          const declarator: Declarator = {
            kind: "declarator",
            name: this.CONSUME(TOKEN.IDENTIFIER),
            arraySpecifier: this.OPTION(() =>
              this.SUBRULE(this.arraySpecifier),
            ),
            init: undefined,
          }
          declarators.push(declarator)
          return declarator
        }),
      })
      this.CONSUME(TOKEN.SEMICOLON)
      return { kind: "structDeclaration", fsType, declarators }
    },
  )
  public structSpecifier = this.RR("structSpecifier", (): StructSpecifier => {
    this.CONSUME(TOKEN.STRUCT)
    const name = this.OPTION2(() => this.CONSUME(TOKEN.IDENTIFIER))
    this.CONSUME(TOKEN.LEFT_BRACE)
    const declarations: StructDeclaration[] = []
    this.MANY(() => declarations.push(this.SUBRULE(this.structDeclaration)))
    this.CONSUME(TOKEN.RIGHT_BRACE)
    return { kind: "structSpecifier", name, declarations }
  })
  public initializer = this.RR(
    "initializer",
    (): Expression => this.SUBRULE(this.assignmentExpression),
  )
  public singleDeclaration = this.RULE("singleDeclaration", (): void =>
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.fullySpecifiedType)
          this.OPTION1(() => {
            this.CONSUME1(TOKEN.IDENTIFIER)
            this.OPTION2(() => {
              this.CONSUME(TOKEN.LEFT_BRACKET)
              this.OPTION3(() => this.SUBRULE(this.constantExpression))
              this.CONSUME(TOKEN.RIGHT_BRACKET)
            })
            this.OPTION4(() => {
              this.CONSUME(TOKEN.EQUAL)
              this.SUBRULE(this.initializer)
            })
          })
        },
      },
      {
        ALT: () => ({
          // TODO this need to be followed by MANY
          kind: "invariantDeclaration",
          INVARIANT: this.CONSUME(TOKEN.INVARIANT),
          IDENTIFIER: this.CONSUME2(TOKEN.IDENTIFIER),
        }),
      },
    ]),
  )
  public initDeclaratorList = this.RR(
    "initDeclaratorList",
    (): InitDeclaratorListDeclaration =>
      this.SUBRULE(this.externalDeclaration, {
        ARGS: [false, false],
      }) as InitDeclaratorListDeclaration,
  )
  public expressionStatement = this.RR(
    "expressionStatement",
    (): ExpressionStatement => {
      const expression = this.OPTION(() => this.SUBRULE(this.expression))
      this.CONSUME(TOKEN.SEMICOLON)
      return { kind: "expressionStatement", expression }
    },
  )
  // simplify to expression | declaration and check in checker
  public condition = this.RR(
    "condition",
    (): Expression | InitDeclaratorListDeclaration =>
      this.OR({
        MAX_LOOKAHEAD: 4,
        DEF: [
          {
            GATE: this.BACKTRACK(this.singleDeclaration),
            // TODO
            // ALT: () => {
            //   this.SUBRULE2(this.fullySpecifiedType)
            //   this.CONSUME(TOKEN.IDENTIFIER)
            //   this.CONSUME(TOKEN.EQUAL)
            //   this.SUBRULE3(this.initializer)
            // },
            ALT: (): InitDeclaratorListDeclaration => {
              const fsType = this.SUBRULE2(this.fullySpecifiedType)
              const name = this.CONSUME(TOKEN.IDENTIFIER)
              this.CONSUME(TOKEN.EQUAL)
              const init = this.SUBRULE3(this.initializer)
              return {
                kind: "initDeclaratorListDeclaration",
                fsType,
                declarators: [
                  { kind: "declarator", name, init, arraySpecifier: undefined },
                ],
              }
            },
          },
          {
            ALT: () => this.SUBRULE(this.expression),
          },
        ],
      }),
  )
  public caseLabel = this.RR(
    "caseLabel",
    (): CaseLabel =>
      this.OR([
        {
          ALT: () => {
            this.CONSUME(TOKEN.CASE)
            const case_ = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.COLON)
            return { kind: "caseLabel", case_ }
          },
        },
        {
          ALT: () => {
            this.CONSUME2(TOKEN.DEFAULT)
            this.CONSUME2(TOKEN.COLON)
            return { kind: "caseLabel", case_: undefined }
          },
        },
      ]),
  )
  public selectionStatement = this.RR(
    "selectionStatement",
    (): SelectionStatement => {
      this.CONSUME(TOKEN.IF)
      this.CONSUME(TOKEN.LEFT_PAREN)
      const condition = this.SUBRULE(this.expression)
      this.CONSUME(TOKEN.RIGHT_PAREN)
      const yes = this.SUBRULE2(this.statement, { ARGS: [true] })
      const no = this.OPTION(() => {
        this.CONSUME(TOKEN.ELSE)
        return this.SUBRULE3(this.statement, { ARGS: [true] })
      })
      return { kind: "selectionStatement", condition, yes, no }
    },
  )
  public statement = this.RR(
    "statement",
    (newScope?: boolean): Statement =>
      this.OR<Statement>([
        {
          ALT: () => this.SUBRULE(this.ppDirective),
          IGNORE_AMBIGUITIES: true,
        },
        {
          // We want "IDENTIFIER ;" to be parsed as a variableExpression, so
          // we add a special rule here.
          ALT: () => {
            const v = this.CONSUME(TOKEN.IDENTIFIER)
            this.CONSUME(TOKEN.SEMICOLON)
            return {
              kind: "expressionStatement",
              expression: { kind: "variableExpression", var: v },
            }
          },
          IGNORE_AMBIGUITIES: true,
        },
        // Attempt to parse expressionStatement first, so that ambiguities
        // are resolved as expressions.
        {
          GATE: this.BACKTRACK(this.expressionStatement),
          ALT: () => this.SUBRULE(this.expressionStatement),
        },
        // declarationStatement
        { ALT: () => this.SUBRULE(this.initDeclaratorList) },
        { ALT: () => this.SUBRULE(this.selectionStatement) },
        { ALT: () => this.SUBRULE(this.switchStatement) },
        // { ALT: () => this.SUBRULE(this.caseLabel) }, TODO
        { ALT: () => this.SUBRULE(this.iterationStatement) },
        { ALT: () => this.SUBRULE(this.jumpStatement) },
        {
          ALT: () =>
            this.SUBRULE(this.compoundStatement, { ARGS: [!!newScope] }),
        },
      ]),
  )
  public compoundStatement = this.RR(
    "compoundStatement",
    (newScope?: boolean): CompoundStatement => {
      if (typeof newScope === "object") {
        throw new Error()
      }
      this.CONSUME(TOKEN.LEFT_BRACE)
      const statements: Statement[] = []
      this.MANY(() => statements.push(this.SUBRULE(this.statement)))
      this.CONSUME(TOKEN.RIGHT_BRACE)
      return { kind: "compoundStatement", statements, newScope: !!newScope }
    },
  )
  //SPEC     FOR LEFT_PAREN for_init_statement for_rest_statement RIGHT_PAREN statement_no_new_scope
  public iterationStatement = this.RR(
    "iterationStatement",
    (): IterationStatement =>
      this.OR([
        {
          ALT: (): WhileStatement => {
            this.CONSUME(TOKEN.WHILE)
            this.CONSUME(TOKEN.LEFT_PAREN)
            const conditionExpression = this.SUBRULE(this.condition)
            this.CONSUME(TOKEN.RIGHT_PAREN)
            const statement = this.SUBRULE(this.statement)
            return { kind: "whileStatement", conditionExpression, statement }
          },
        },
        {
          ALT: (): DoWhileStatement => {
            this.CONSUME2(TOKEN.DO)
            const statement = this.SUBRULE2(this.statement, { ARGS: [true] })
            this.CONSUME2(TOKEN.WHILE)
            this.CONSUME2(TOKEN.LEFT_PAREN)
            const conditionExpression = this.SUBRULE2(this.expression)
            this.CONSUME2(TOKEN.RIGHT_PAREN)
            this.CONSUME2(TOKEN.SEMICOLON)
            return { kind: "doWhileStatement", statement, conditionExpression }
          },
        },
        {
          ALT: (): ForStatement => {
            this.CONSUME3(TOKEN.FOR)
            this.CONSUME3(TOKEN.LEFT_PAREN)
            const initExpression = this.OR3<Statement>([
              {
                GATE: this.BACKTRACK(this.initDeclaratorList),
                ALT: () => this.SUBRULE(this.initDeclaratorList),
              },
              {
                ALT: () => this.SUBRULE(this.expressionStatement),
              },
            ])
            const conditionExpression = this.OPTION3(() =>
              this.SUBRULE3(this.condition),
            )
            this.CONSUME4(TOKEN.SEMICOLON)
            const loopExpression = this.OPTION4(() =>
              this.SUBRULE4(this.expression),
            )
            this.CONSUME3(TOKEN.RIGHT_PAREN)
            const statement = this.SUBRULE3(this.statement)
            return {
              kind: "forStatement",
              initExpression,
              conditionExpression,
              loopExpression,
              statement,
            }
          },
        },
      ]),
  )
  public translationUnit = this.RR("translationUnit", (): TranslationUnit => {
    const declarations: Declaration[] = []
    this.AT_LEAST_ONE(() =>
      declarations.push(
        this.SUBRULE(this.externalDeclaration, { ARGS: [true, true] }),
      ),
    )
    return { kind: "translationUnit", declarations }
  })
  public uniformBlock = this.RR("uniformBlock", (): UniformBlock => {
    // this.CONSUME(TOKEN.UNIFORM)
    const typeQualifier = this.SUBRULE(this.typeQualifier)
    const blockName = this.CONSUME(TOKEN.IDENTIFIER)
    this.CONSUME(TOKEN.LEFT_BRACE)
    const declarations: StructDeclaration[] = []
    this.MANY(() => declarations.push(this.SUBRULE(this.structDeclaration)))
    this.CONSUME(TOKEN.RIGHT_BRACE)
    let namespace: IToken | undefined
    let arraySpecifier
    this.OPTION(() => {
      namespace = this.CONSUME1(TOKEN.IDENTIFIER)
      arraySpecifier = this.OPTION1(() => this.SUBRULE(this.arraySpecifier))
    })
    this.CONSUME(TOKEN.SEMICOLON)
    return {
      kind: "uniformBlock",
      typeQualifier,
      blockName,
      declarations,
      namespace,
      arraySpecifier,
    }
  })
  // Minimum rule we need to test if a uniformBlock is next.
  protected uniformBlockHeader = this.RULE("uniformBlockHeader", () => {
    this.OPTION(() => this.SUBRULE(this.layoutQualifier))
    this.CONSUME(TOKEN.UNIFORM)
    this.CONSUME(TOKEN.IDENTIFIER)
    this.CONSUME(TOKEN.LEFT_BRACE)
  })

  public typeQualifierDeclaration = this.RR(
    "typeQualifierDeclaration",
    (): TypeQualifierDeclaration => {
      const typeQualifier = this.SUBRULE(this.typeQualifier)
      this.CONSUME(TOKEN.SEMICOLON)
      return { kind: "typeQualifierDeclaration", typeQualifier }
    },
  )

  public externalDeclaration = this.RR(
    "externalDeclaration",
    (uniformBlock?: boolean, function_?: boolean): Declaration =>
      this.OR([
        { ALT: () => this.SUBRULE(this.ppCall) },
        { ALT: () => this.SUBRULE(this.ppDirective) },
        // type qualifier declaration
        {
          GATE: this.BACKTRACK(this.typeQualifierDeclaration),
          ALT: () => this.SUBRULE(this.typeQualifierDeclaration),
        },
        // uniform/interface block
        {
          GATE: uniformBlock
            ? this.BACKTRACK(this.uniformBlockHeader)
            : () => false,
          ALT: (): UniformBlock => this.SUBRULE(this.uniformBlock),
        },
        // initDeclaratorList, functionPrototype or functionDefinition
        {
          ALT: () => {
            const type = this.SUBRULE(this.fullySpecifiedType)
            return this.OR2([
              // functionPrototype
              {
                GATE: function_ ? undefined : () => false,
                ALT: () => {
                  const name = this.CONSUME1(TOKEN.IDENTIFIER)
                  this.CONSUME(TOKEN.LEFT_PAREN)
                  const params: ParameterDeclaration[] = []
                  this.MANY_SEP({
                    SEP: TOKEN.COMMA,
                    DEF: () =>
                      params.push(this.SUBRULE(this.parameterDeclaration)),
                  })
                  this.CONSUME(TOKEN.RIGHT_PAREN)
                  return this.OR3([
                    {
                      ALT: (): FunctionPrototype => {
                        this.CONSUME(TOKEN.SEMICOLON)
                        return {
                          kind: "functionPrototype",
                          name,
                          returnType: type,
                          params,
                        }
                      },
                    },
                    {
                      // GATE: () => !noFunctionDefinition,
                      ALT: (): FunctionDefinition => {
                        const body = this.SUBRULE(this.compoundStatement)
                        return {
                          kind: "functionDefinition",
                          name,
                          returnType: type,
                          params,
                          body,
                        }
                      },
                      IGNORE_AMBIGUITIES: false,
                    },
                  ])
                },
              },
              // initDeclaratorList
              {
                ALT: () => {
                  const declarators: Declarator[] = []
                  this.MANY_SEP2({
                    SEP: TOKEN.COMMA,
                    DEF: this.ANNOTATE(() => {
                      const name = this.CONSUME3(TOKEN.IDENTIFIER)
                      const arraySpecifier = this.OPTION5(() =>
                        this.SUBRULE(this.arraySpecifier),
                      )
                      const init = this.OPTION7(() => {
                        this.CONSUME(TOKEN.EQUAL)
                        return this.SUBRULE(this.initializer)
                      })
                      const declarator: Declarator = {
                        kind: "declarator",
                        name,
                        arraySpecifier,
                        init,
                      }
                      declarators.push(declarator)
                      return declarator
                    }),
                  })
                  this.CONSUME2(TOKEN.SEMICOLON)
                  return {
                    kind: "initDeclaratorListDeclaration",
                    fsType: type,
                    declarators,
                  }
                },
              },
            ])
          },
        },
        // precisionQualifier
        {
          ALT: (): PrecisionDeclaration => {
            this.CONSUME(TOKEN.PRECISION)
            const precisionQualifier = this.CONSUME(TOKEN.PRECISION_QUALIFIER)
            const typeSpecifierNoPrec = this.SUBRULE(this.typeSpecifierNoPrec)
            this.CONSUME3(TOKEN.SEMICOLON)
            return {
              kind: "precisionDeclaration",
              precisionQualifier,
              typeSpecifierNoPrec,
            }
          },
        },
      ]),
  )

  public ppDefine = this.RR("ppDefine", (): PpDefine => {
    this.CONSUME(TOKEN.HASH)
    this.CONSUME(TOKEN.DEFINE)
    const what = this.CONSUME(TOKEN.IDENTIFIER)
    const isFunctionMacro =
      this.LA(1).tokenType === TOKEN.LEFT_PAREN &&
      what.endOffset! + 1 === this.LA(1).startOffset
    const params = this.OPTION({
      GATE: () => isFunctionMacro,
      DEF: () => {
        this.CONSUME(TOKEN.LEFT_PAREN)
        const params: Token[] = []
        this.MANY_SEP({
          SEP: TOKEN.COMMA,
          DEF: () => params.push(this.SUBRULE(this.ppIdentifier)),
        })
        this.CONSUME(TOKEN.RIGHT_PAREN)
        return params
      },
    })
    const tokens = this.getTokensOnLine()
    const d: PpDefine = {
      kind: "ppDefine",
      what,
      params,
      tokens,
      node: undefined,
    }
    this.ppDefs.push(d)
    return d
  })

  public ppInclude = this.RR("ppInclude", (): PpInclude => {
    this.CONSUME(TOKEN.HASH)
    this.CONSUME(TOKEN.INCLUDE)
    let str = ""
    this.OR([
      {
        ALT: () => {
          str = this.CONSUME(TOKEN.STRING).image
        },
      },
      {
        ALT: () => {
          // three.js style import
          //https://github.com/mrdoob/three.js/blob/98616257db739e50513437c6913156c17a6d40e4/src/renderers/webgl/WebGLProgram.js#L239
          this.CONSUME(TOKEN.LEFT_ANGLE)
          const t = this.CONSUME(TOKEN.IDENTIFIER)
          this.CONSUME(TOKEN.RIGHT_ANGLE)
          str = "<" + t.image + ">"
        },
      },
    ])
    return { kind: "ppInclude", what: str }
  })

  public ppCall = this.RR("ppCall", (): PpCall => {
    const callee = this.CONSUME(TOKEN.IDENTIFIER)
    this.CONSUME(TOKEN.LEFT_PAREN)
    const args: { tokens: Token[]; node: Node | undefined }[] = []
    this.MANY_SEP({
      SEP: TOKEN.COMMA,
      DEF: () => {
        const tokens: Token[] = []
        this.MANY(() =>
          this.OR({
            // IGNORE_AMBIGUITIES: true,
            DEF: [
              {
                ALT: () => {
                  const tt = this.SUBRULE(this.ppCallArg)
                  this.ACTION(() => tokens.push(...tt))
                },
              },
              { ALT: () => tokens.push(this.CONSUME(TOKEN.BASIC_TYPE)) },
              { ALT: () => tokens.push(this.CONSUME(TOKEN.ASSIGN_OP)) },
              { ALT: () => tokens.push(this.CONSUME(TOKEN.SHIFT_OP)) },
              { ALT: () => tokens.push(this.CONSUME(TOKEN.CONSTANT)) },
              { ALT: () => tokens.push(this.CONSUME(TOKEN.KEYWORD)) },
              { ALT: () => tokens.push(this.CONSUME2(TOKEN.IDENTIFIER)) },
            ],
          }),
        )
        args.push({ tokens, node: undefined })
      },
      MAX_LOOKAHEAD: 1,
    })
    this.CONSUME(TOKEN.RIGHT_PAREN)
    return { kind: "ppCall", callee, args }
  })

  public ppCallArg = this.RULE("ppCallArg", (): Token[] => {
    const tokens = []
    tokens.push(this.CONSUME(TOKEN.LEFT_PAREN))
    this.MANY(() =>
      this.OR([
        {
          ALT: () => {
            const tt = this.SUBRULE(this.ppCallArg)
            this.ACTION(() => tokens.push(...tt))
          },
        },
        {
          // GATE: () => this.LA(1).tokenType !== TOKEN.COMMA,
          ALT: () => {
            tokens.push(this.LA(1))
            return this.SKIP_TOKEN()
          },
        },
      ]),
    )
    tokens.push(this.CONSUME(TOKEN.RIGHT_PAREN))

    return tokens
  })

  public ppNone = this.RR("ppNone", (): PpNode => {
    this.CONSUME(TOKEN.HASH)
    const dir = this.OR([
      { ALT: () => this.CONSUME(TOKEN.ELSE) },
      { ALT: () => this.CONSUME(TOKEN.ENDIF) },
    ])

    const d: PpNode = { kind: "ppDir", dir, tokens: [], node: undefined }
    this.ppDefs.push(d)
    return d
  })
  public ppMulti = this.RR("ppMulti", (): PpNode => {
    this.CONSUME(TOKEN.HASH)
    const dir = this.OR([
      { ALT: () => this.CONSUME(TOKEN.IF) },
      { ALT: () => this.CONSUME(TOKEN.ELIF) },
      { ALT: () => this.CONSUME(TOKEN.ERROR) },
      { ALT: () => this.CONSUME(TOKEN.VERSION) },
      { ALT: () => this.CONSUME(TOKEN.LINE) },
    ])

    const tokens = this.getTokensOnLine()
    const d: PpNode = { kind: "ppDir", dir, tokens, node: undefined }
    this.ppDefs.push(d)
    return d
  })
  public ppPragma = this.RR("ppPragma", (): PpPragma => {
    const dir = this.CONSUME(TOKEN.PRAGMA_DIRECTIVE)
    return { kind: "ppPragma", dir }
  })
  public ppSingle = this.RR("ppSingle", (): PpNode => {
    this.CONSUME(TOKEN.HASH)
    const dir = this.OR([
      { ALT: () => this.CONSUME(TOKEN.IFDEF) },
      { ALT: () => this.CONSUME(TOKEN.IFNDEF) },
    ])

    const token = this.CONSUME(TOKEN.IDENTIFIER)
    return { kind: "ppDir", dir, tokens: [token], node: undefined }
  })
  public ppExtension = this.RR("ppExtension", (): PpExtension => {
    this.CONSUME(TOKEN.HASH)
    this.CONSUME(TOKEN.EXTENSION)
    const extension = this.CONSUME(TOKEN.IDENTIFIER)
    this.CONSUME(TOKEN.COLON)
    const behavior = this.CONSUME1(TOKEN.IDENTIFIER)
    return { kind: "ppExtension", extension, behavior }
  })
  public ppDirective = this.RR(
    "ppDirective",
    (): PpNode =>
      this.OR([
        { ALT: () => this.SUBRULE(this.ppDefine) },
        { ALT: () => this.SUBRULE(this.ppExtension) },
        { ALT: () => this.SUBRULE(this.ppNone) },
        { ALT: () => this.SUBRULE(this.ppSingle) },
        { ALT: () => this.SUBRULE(this.ppMulti) },
        { ALT: () => this.SUBRULE(this.ppPragma) },
        { ALT: () => this.SUBRULE(this.ppInclude) },
      ]),
  )

  public ppIdentifier = this.RR(
    "ppIdentifier",
    (): Token =>
      this.OR([
        { ALT: () => this.CONSUME(TOKEN.IDENTIFIER) },
        { ALT: () => this.CONSUME(TOKEN.KEYWORD) },
        { ALT: () => this.CONSUME(TOKEN.BASIC_TYPE) },
      ]),
  )

  protected getTokensOnLine(): Token[] {
    const tokens = []
    const line = getTokenStartLine(this.LA(0))
    let tok
    while (getTokenStartLine((tok = this.LA(1))) === line) {
      tokens.push(tok)
      this.SKIP_TOKEN()
    }
    return tokens
  }

  protected backtracking!: boolean
  public ppDefs: (PpDefine | PpDir)[] = []

  // Whether we are currently parsing a preproc expression,
  // e.g. the condition of an #if.
  private preprocessing!: boolean

  public constructor() {
    super(ALL_TOKENS, { skipValidations: !DEV })

    this.performSelfAnalysis()
  }

  public reset() {
    super.reset()
    this.ppDefs = []
    this.backtracking = false
    this.preprocessing = false
  }

  protected LEFT_ASSOC(rule: (idx: number) => Expression, tok: TokenType) {
    const firstToken = this.LA(1)
    let result = this.SUBRULE1(rule)
    this.MANY(() => {
      const op = this.CONSUME(tok)
      const rhs = this.SUBRULE2(rule)
      result = {
        kind: "binaryExpression",
        lhs: result,
        rhs,
        op,
        firstToken,
        lastToken: this.LA(0),
      }
      return result
    })
    return result
  }

  protected ANNOTATE<T extends Node | IToken>(
    implementation: (...implArgs: any[]) => T,
  ): (...implArgs: any[]) => T {
    return (...args: any[]) => {
      const firstToken = this.LA(1)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = implementation(...args)
      if (result && isNode(result) && !result.firstToken) {
        this.FINALIZE(result, firstToken)
      }
      return result
    }
  }

  protected BACKTRACK<T>(
    grammarRule: (...args: any[]) => T,
    args?: any[],
  ): () => boolean {
    const backtrack = super.BACKTRACK(grammarRule, args)
    return function (this: GLSLParser) {
      try {
        this.backtracking = true
        return backtrack.call(this)
      } finally {
        this.backtracking = false
      }
    }
  }

  protected RR<F extends (...args: any[]) => any>(
    name: string,
    implementation: F,
    config?: IRuleConfig<ReturnType<F>>,
  ): F {
    return super.RULE(name, this.ANNOTATE(implementation), config) as F
  }

  protected FINALIZE(n: Node, firstToken: IToken): void {
    if (!this.RECORDING_PHASE && !this.backtracking) {
      n.firstToken = firstToken
      n.lastToken = this.LA(0)
    }
  }

  public isAtEof(): boolean {
    return this.LA(1).tokenType === EOF
  }
}

// ONLY ONCE
export const GLSL_PARSER = new GLSLParser()

export function checkParsingErrors(
  input: string,
  errors: IRecognitionException[],
) {
  if (errors.length > 0) {
    throw new Error(
      "PARSE ERROR: " +
        errors
          .map(
            (e) =>
              e.message +
              "\n" +
              e.context.ruleStack.join(" > ") +
              "\n" +
              substrContext(input, e.token as ExpandedLocation),
          )
          .join("\n"),
    )
  }
}

export function shortDesc(node: Node | IToken) {
  return isToken(node)
    ? `${node.tokenType.name}(${node.image}) ${node.startOffset}-${
        "" + node.endOffset
      }`
    : `${node.kind} ${node.firstToken!.startOffset}-${
        "" + node.lastToken!.endOffset
      }`
}

function nodeShortDesc(x: Node) {
  return `${x.kind} ${x.firstToken!.startLine!}:${x.firstToken!
    .startColumn!}-${x.lastToken!.endLine!}:${x.lastToken!.endColumn! + 1}`
}

function tokenShortDesc(x: IToken) {
  return `${x.tokenType.name} ${x.startLine!}:${x.startColumn!}-${x.endLine!}:${
    x.endColumn! + 1
  }`
}

export function shortDesc2(node: Node | IToken) {
  return isToken(node) ? tokenShortDesc(node) : nodeShortDesc(node)
}

function checkTokenErrors(lexingResult: ILexingResult): void {
  const errors = []

  function markError(where: IToken, err: string, msg?: string) {
    errors.push({ where, err, msg })
  }

  for (const token of lexingResult.tokens) {
    if (token.tokenType === TOKEN.NON_PP_IDENTIFIER) {
      if (token.image.includes("__")) {
        markError(
          token,
          "All identifiers containing two consecutive underscores (__) are reserved for use by underlying software layers.",
        )
      } else if (RESERVED_KEYWORDS.includes(token.image)) {
        markError(token, token.image + " is a reserved keyword.")
      } else if (token.image.length > 1024) {
        markError(token, "G0004", "The maximum identifier length is 1024.")
      }
    }
  }
}

export function parseInput(originalInput: string): TranslationUnit {
  const noLineCont = applyLineContinuations(originalInput)

  const lexingResult = GLSL_LEXER.tokenize(noLineCont.result)
  checkLexingErrors(noLineCont.result, lexingResult)

  fixLocations(lexingResult.tokens, noLineCont.changes)

  checkTokenErrors(lexingResult)

  // "input" is a setter which will reset the glslParser's state.
  GLSL_PARSER.input = lexingResult.tokens
  const result = GLSL_PARSER.translationUnit()
  checkParsingErrors(noLineCont.result, GLSL_PARSER.errors)

  const ppDefs = GLSL_PARSER.ppDefs

  function tryParse(
    tokens: Token[],
    rule: (glslParser: GLSLParser) => Node,
  ): Node | undefined {
    GLSL_PARSER.input = tokens
    const result = rule(GLSL_PARSER)
    if (GLSL_PARSER.isAtEof() && GLSL_PARSER.errors.length === 0) {
      return result
    } else {
      return undefined
    }
  }

  for (const ppDef of ppDefs) {
    ppDef.node =
      tryParse(ppDef.tokens, (p) => p.externalDeclaration(true, true)) ??
      tryParse(ppDef.tokens, (p) => p.statement()) ??
      tryParse(ppDef.tokens, (p) => p.expression())
  }

  result.comments = lexingResult.groups.COMMENTS
  return result
}
