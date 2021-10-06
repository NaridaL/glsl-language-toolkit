/* eslint-disable @typescript-eslint/member-ordering */
import {
  EmbeddedActionsParser,
  ILexingResult,
  IRecognitionException,
  IRuleConfig,
  IToken,
  TokenType,
} from "chevrotain"
import {
  ArraySpecifier,
  AssignmentExpression,
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
  InitDeclaratorListDeclaration,
  IterationStatement,
  JumpStatement,
  LayoutQualifier,
  Node,
  ParameterDeclaration,
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
  TypeSpecifier,
  UnaryExpression,
  WhileStatement,
} from "./nodes"
import { ALL_TOKENS, GLSL_LEXER, RESERVED_KEYWORDS, TOKEN } from "./lexer"

import { DEV, substrContext } from "./util"

class GLSLParser extends EmbeddedActionsParser {
  protected currentChildren: Node[] = []
  protected backtracking = false
  //SPEC//     // GramNote:  No '*' or '&' unary ops.  Pointers are not supported.
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
  //SPEC//     multiplicativeExpression PERCENT unaryExpression
  public multiplicativeExpression = this.RR(
    "multiplicativeExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.unaryExpression, TOKEN.MULTIPLICATIVE_OP),
  )
  //SPEC//     additiveExpression DASH multiplicativeExpression
  public additiveExpression = this.RR(
    "additiveExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.multiplicativeExpression, TOKEN.ADDITIVE_OP),
  )
  //SPEC//     shiftExpression RIGHT_OP additiveExpression
  public shiftExpression = this.RR(
    "shiftExpression",
    (): Expression => this.LEFT_ASSOC(this.additiveExpression, TOKEN.SHIFT_OP),
  )
  //SPEC//     relationalExpression GE_OP shiftExpression
  public relationalExpression = this.RR(
    "relationalExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.shiftExpression, TOKEN.RELATIONAL_OP),
  )

  //SPEC// variableIdentifier:
  //SPEC//     IDENTIFIER
  //SPEC// primaryExpression:
  //SPEC//     variableIdentifier
  //SPEC//     INTCONSTANT
  //SPEC//     UINTCONSTANT
  //SPEC//     FLOATCONSTANT
  //SPEC//     BOOLCONSTANT
  //SPEC//     equalityExpression NE_OP relationalExpression
  public equalityExpression = this.RR(
    "equalityExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.relationalExpression, TOKEN.EQUALITY_OP),
  )
  //SPEC// postfixExpression:
  //SPEC//     primaryExpression
  //SPEC//     postfixExpression LEFT_BRACKET integerExpression RIGHT_BRACKET
  //SPEC//     functionCall
  //SPEC//     postfixExpression DOT FIELD_SELECTION
  //SPEC//     postfixExpression INC_OP
  //SPEC//     postfixExpression DEC_OP
  //SPEC//     andExpression AMPERSAND equalityExpression
  public andExpression = this.RR(
    "andExpression",
    (): Expression => this.LEFT_ASSOC(this.equalityExpression, TOKEN.AMPERSAND),
  )
  //SPEC// integerExpression:
  //SPEC//     expression
  //SPEC// functionCall:
  //SPEC//     functionCallOrMethod
  //SPEC// functionCallOrMethod:
  //SPEC//     functionCallGeneric
  //SPEC//     postfixExpression DOT functionCallGeneric
  //SPEC// functionCallGeneric:
  //SPEC//     functionCallHeaderWithParameters RIGHT_PAREN
  //SPEC//     functionCallHeaderNoParameters RIGHT_PAREN
  //SPEC// functionCallHeaderNoParameters:
  //SPEC//     functionCallHeader VOID
  //SPEC//     functionCallHeader
  //SPEC// functionCallHeaderWithParameters:
  //SPEC//     functionCallHeader assignmentExpression
  //SPEC//     functionCallHeaderWithParameters COMMA assignmentExpression
  //SPEC// functionCallHeader:
  //SPEC//     functionIdentifier LEFT_PAREN
  //SPEC//     // GramNote: Constructors look like functions, but lexical analysis recognized most of them as
  //SPEC//     // keywords.  They are now recognized through “typeSpecifier”.
  //SPEC//     // Methods (.length) and identifiers are recognized through postfixExpression.
  //SPEC// functionIdentifier:
  //SPEC//     typeSpecifier
  //SPEC//     IDENTIFIER
  //SPEC//     exclusiveOrExpression CARET andExpression
  public exclusiveOrExpression = this.RR(
    "exclusiveOrExpression",
    (): Expression => this.LEFT_ASSOC(this.andExpression, TOKEN.CARET),
  )
  //SPEC//     inclusiveOrExpression VERTICAL_BAR exclusiveOrExpression
  public inclusiveOrExpression = this.RR(
    "inclusiveOrExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.exclusiveOrExpression, TOKEN.VERTICAL_BAR),
  )
  //SPEC// unaryExpression:
  //SPEC//     postfixExpression
  //SPEC//     INC_OP unaryExpression
  //SPEC//     DEC_OP unaryExpression
  //SPEC//     unaryOperator unaryExpression
  //SPEC//     // GramNote:  No traditional style type casts.
  //SPEC// unaryOperator:
  //SPEC//     PLUS
  //SPEC//     DASH
  //SPEC//     BANG
  //SPEC//     TILDE
  //SPEC//     logicalAndExpression AND_OP inclusiveOrExpression
  public logicalAndExpression = this.RR(
    "logicalAndExpression",
    (): Expression => this.LEFT_ASSOC(this.inclusiveOrExpression, TOKEN.AND_OP),
  )
  //SPEC// multiplicativeExpression:
  //SPEC//     unaryExpression
  //SPEC//     multiplicativeExpression STAR unaryExpression
  //SPEC//     multiplicativeExpression SLASH unaryExpression
  //SPEC//     logicalXorExpression XOR_OP logicalAndExpression
  public logicalXorExpression = this.RR(
    "logicalXorExpression",
    (): Expression => this.LEFT_ASSOC(this.logicalAndExpression, TOKEN.XOR_OP),
  )
  //SPEC// additiveExpression:
  //SPEC//     multiplicativeExpression
  //SPEC//     additiveExpression PLUS multiplicativeExpression
  //SPEC//     logicalOrExpression OR_OP logicalXorExpression
  public logicalOrExpression = this.RR(
    "logicalOrExpression",
    (): Expression => this.LEFT_ASSOC(this.logicalXorExpression, TOKEN.OR_OP),
  )
  //SPEC// shiftExpression:
  //SPEC//     additiveExpression
  //SPEC//     shiftExpression LEFT_OP additiveExpression
  // and do semantic check later.
  public assignmentExpression = this.RR(
    "assignmentExpression",
    (): Expression => {
      let result = this.SUBRULE(this.conditionalExpression)
      this.MANY(
        this.ANNOTATE((): AssignmentExpression => {
          const op = this.CONSUME(TOKEN.ASSIGN_OP)
          const rhs = this.SUBRULE1(this.conditionalExpression)
          result = { kind: "assignmentExpression", lhs: result, op, rhs }
          return result
        }),
      )
      return result
    },
  )
  //SPEC// relationalExpression:
  //SPEC//     shiftExpression
  //SPEC//     relationalExpression LEFT_ANGLE shiftExpression
  //SPEC//     relationalExpression RIGHT_ANGLE shiftExpression
  //SPEC//     relationalExpression LE_OP shiftExpression
  //SPEC//     expression COMMA assignmentExpression
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
  //SPEC// equalityExpression:
  //SPEC//     relationalExpression
  //SPEC//     equalityExpression EQ_OP relationalExpression
  //SPEC//     LEFT_PAREN expression RIGHT_PAREN
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
            _const: this.CONSUME(TOKEN.CONSTANT),
          }),
        },
      ]),
  )
  //SPEC// andExpression:
  //SPEC//     equalityExpression
  //SPEC//     logicalOrExpression QUESTION expression COLON assignmentExpression
  public conditionalExpression = this.RR(
    "conditionalExpression",
    (): Expression => {
      const lhs = this.SUBRULE1(this.logicalOrExpression)

      return (
        this.OPTION(() => ({
          kind: "conditionalExpression",
          condition: lhs,
          QUESTION: this.CONSUME(TOKEN.QUESTION),
          yes: this.SUBRULE2(this.expression),
          COLON: this.CONSUME(TOKEN.COLON),
          no: this.SUBRULE3(this.assignmentExpression),
        })) || lhs
      )
    },
  )
  //SPEC// exclusiveOrExpression:
  //SPEC//     andExpression
  //SPEC//     conditionalExpression
  public constantExpression = this.RR(
    "constantExpression",
    (): Expression => this.SUBRULE(this.conditionalExpression),
  )
  //SPEC// inclusiveOrExpression:
  //SPEC//     exclusiveOrExpression
  public declaration = this.RR(
    "declaration",
    (): Declaration => this.SUBRULE(this.externalDeclaration, { ARGS: [true] }),
  )
  //SPEC// logicalAndExpression:
  //SPEC//     inclusiveOrExpression
  //SPEC//     IDENTIFIER EQUAL UINTCONSTANT
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
          init = this.OR9([
            { ALT: () => this.CONSUME(TOKEN.INTCONSTANT) },
            { ALT: () => this.CONSUME(TOKEN.UINTCONSTANT) },
          ])
        })
        layoutQualifierIds.push({ IDENTIFIER, init })
      },
    })
    return { kind: "layoutQualifier", layoutQualifierIds }
  })
  //SPEC// logicalXorExpression:
  //SPEC//     logicalAndExpression
  //SPEC//     UNIFORM
  public storageQualifier = this.RR(
    "storageQualifier",
    (): StorageQualifier => {
      let CONST, CENTROID, IN, OUT, UNIFORM
      this.OR([
        { ALT: () => (CONST = this.CONSUME(TOKEN.CONST)) },
        {
          ALT: () => {
            CENTROID = this.OPTION(() => this.CONSUME(TOKEN.CENTROID))
            this.OR9([
              { ALT: () => (IN = this.CONSUME(TOKEN.IN)) },
              { ALT: () => (OUT = this.CONSUME(TOKEN.OUT)) },
            ])
          },
        },
        { ALT: () => (UNIFORM = this.CONSUME(TOKEN.UNIFORM)) },
      ])
      return { kind: "storageQualifier", CONST, CENTROID, IN, OUT, UNIFORM }
    },
  )
  //SPEC// logicalOrExpression:
  //SPEC//     logicalXorExpression
  //SPEC//     invariantQualifier interpolationQualifier storageQualifier
  public typeQualifier = this.RR("typeQualifier", (): TypeQualifier => {
    let storageQualifier: StorageQualifier | undefined
    let layoutQualifier: LayoutQualifier | undefined
    let interpolationQualifier: Token | undefined
    let invariantQualifier: Token | undefined
    this.OR([
      {
        ALT: () => {
          storageQualifier = this.SUBRULE1(this.storageQualifier)
        },
      },
      {
        ALT: () => {
          layoutQualifier = this.SUBRULE2(this.layoutQualifier)
          storageQualifier = this.OPTION1(() =>
            this.SUBRULE3(this.storageQualifier),
          )
        },
      },
      {
        ALT: () => {
          interpolationQualifier = this.CONSUME(TOKEN.INTERPOLATION_QUALIFIER)
          storageQualifier = this.OPTION2(() =>
            this.SUBRULE5(this.storageQualifier),
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
  //SPEC// conditionalExpression:
  //SPEC//     logicalOrExpression
  //SPEC//     LOW_PRECISION
  public precisionQualifier = this.RR(
    "precisionQualifier",
    (): IToken => this.CONSUME(TOKEN.PRECISION_QUALIFIER),
  )
  //SPEC// assignmentExpression:
  //SPEC//     conditionalExpression
  //SPEC//     unaryExpression assignmentOperator assignmentExpression
  //SPEC// assignmentOperator:
  //SPEC//     EQUAL
  //SPEC//     MULASSIGN
  //SPEC//     DIVASSIGN
  //SPEC//     MODASSIGN
  //SPEC//     ADDASSIGN
  //SPEC//     SUBASSIGN
  //SPEC//     LEFTASSIGN
  //SPEC//     RIGHTASSIGN
  //SPEC//     ANDASSIGN
  //SPEC//     XORASSIGN
  //SPEC//     ORASSIGN
  // conditionalExpression starts with unaryExpression, so rewrite to
  // assignmentExpression: conditionalExpression (assignmentOperator conditionalExpression)*
  public arraySpecifier = this.RR("arraySpecifier", (): ArraySpecifier => {
    this.CONSUME(TOKEN.LEFT_BRACKET)
    const size = this.OPTION3(() => this.SUBRULE(this.constantExpression))
    this.CONSUME(TOKEN.RIGHT_BRACKET)
    return { kind: "arraySpecifier", size }
  })
  //SPEC// expression:
  //SPEC//     assignmentExpression
  //SPEC//     IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
  public structDeclarationList = this.RULE(
    "structDeclarationList",
    (): StructDeclaration[] => {
      const result: StructDeclaration[] = []
      this.MANY(
        this.ANNOTATE(() => {
          const fsType = this.SUBRULE(this.fullySpecifiedType)
          const declarators: Declarator[] = []
          this.MANY_SEP({
            SEP: TOKEN.COMMA,
            DEF: () =>
              declarators.push({
                kind: "declarator",
                name: this.CONSUME(TOKEN.IDENTIFIER),
                arraySpecifier: this.OPTION(() =>
                  this.SUBRULE(this.arraySpecifier),
                ),
                init: undefined,
              }),
          })
          this.CONSUME(TOKEN.SEMICOLON)
          const declaration: StructDeclaration = {
            kind: "structDeclaration",
            fsType,
            declarators,
          }
          result.push(declaration)
          return declaration
        }),
      )
      return result
    },
  )
  //SPEC// constantExpression:
  public structSpecifier = this.RR("structSpecifier", (): StructSpecifier => {
    this.CONSUME(TOKEN.STRUCT)
    const name = this.OPTION2(() => this.CONSUME(TOKEN.IDENTIFIER))
    this.CONSUME(TOKEN.LEFT_BRACE)
    const declarations = this.SUBRULE(this.structDeclarationList)
    this.CONSUME(TOKEN.RIGHT_BRACE)
    return { kind: "structSpecifier", name, declarations }
  })
  //SPEC// declaration:
  //SPEC//     functionPrototype SEMICOLON
  //SPEC//     initDeclaratorList SEMICOLON
  //SPEC//     PRECISION precisionQualifier typeSpecifierNoPrec SEMICOLON
  //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE SEMICOLON
  //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER SEMICOLON
  //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER LEFT_BRACKET
  //SPEC//     constantExpression RIGHT_BRACKET SEMICOLON
  //SPEC//     TYPE_NAME
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
  //SPEC//     typeSpecifierNonarray LEFT_BRACKET constantExpression RIGHT_BRACKET
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
  //SPEC// functionPrototype:
  //SPEC//     functionDeclarator RIGHT_PAREN
  //SPEC// functionDeclarator:
  //SPEC//     functionHeader
  //SPEC//     functionHeaderWithParameters
  //SPEC// functionHeaderWithParameters:
  //SPEC//     functionHeader parameterDeclaration
  //SPEC//     functionHeaderWithParameters COMMA parameterDeclaration
  //SPEC// functionHeader:
  //SPEC//     fullySpecifiedType IDENTIFIER LEFT_PAREN
  //SPEC// parameterDeclarator:
  //SPEC//     typeSpecifier IDENTIFIER
  //SPEC//     typeSpecifier IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
  //SPEC// parameterDeclaration:
  //SPEC//     parameterTypeQualifier parameterQualifier parameterDeclarator
  //SPEC//     parameterQualifier parameterDeclarator
  //SPEC//     parameterTypeQualifier parameterQualifier parameterTypeSpecifier
  //SPEC//     parameterQualifier parameterTypeSpecifier
  //SPEC// parameterQualifier:
  //SPEC//     /* empty */
  //SPEC//     IN
  //SPEC//     OUT
  //SPEC//     INOUT
  //SPEC// parameterTypeSpecifier:
  //SPEC//     FIELD_SELECTION
  public functionCall = this.RR("functionCall", (): FunctionCall => {
    const what = this.SUBRULE(this.typeSpecifierNoPrec)
    this.CONSUME(TOKEN.LEFT_PAREN)
    const args: Expression[] = []
    this.MANY_SEP({
      DEF: () => args.push(this.SUBRULE(this.assignmentExpression)),
      SEP: TOKEN.COMMA,
    })
    this.CONSUME(TOKEN.RIGHT_PAREN)
    return { kind: "functionCall", what, args }
  })

  //SPEC// initDeclaratorList:
  //SPEC//     singleDeclaration
  //SPEC//     initDeclaratorList COMMA IDENTIFIER
  //SPEC//     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
  //SPEC//     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
  //SPEC//     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET EQUAL initializer
  //SPEC//     initDeclaratorList COMMA IDENTIFIER EQUAL initializer
  //SPEC// singleDeclaration:
  //SPEC//     fullySpecifiedType
  //SPEC//     fullySpecifiedType IDENTIFIER
  //SPEC//     fullySpecifiedType IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
  //SPEC//     fullySpecifiedType IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
  //SPEC//     fullySpecifiedType IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET EQUAL initializer
  //SPEC//     fullySpecifiedType IDENTIFIER EQUAL initializer
  //SPEC//     INVARIANT IDENTIFIER
  // used for lookahead
  public functionCallHeader = this.RULE("functionCallHeader", (): void => {
    this.SUBRULE(this.typeSpecifierNoPrec)
    this.CONSUME(TOKEN.LEFT_PAREN)
  })
  //SPEC// fullySpecifiedType:
  //SPEC//     typeSpecifier
  // We add postfixExpression DOT functionCall.
  public postfixExpression = this.RR("postfixExpression", (): Expression => {
    let result = this.OR1([
      {
        GATE: this.BACKTRACK(this.functionCallHeader),
        ALT: () => this.SUBRULE1(this.functionCall),
      },
      {
        ALT: () => this.SUBRULE(this.primaryExpression),
      },
    ])
    this.MANY(() =>
      this.OR2([
        {
          ALT: () => {
            this.CONSUME(TOKEN.LEFT_BRACKET)
            const index = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.RIGHT_BRACKET)
            result = { kind: "arrayAccess", on: result, index }
          },
        },
        {
          ALT: () => {
            this.CONSUME1(TOKEN.DOT)
            const functionCall = this.SUBRULE2(this.functionCall)
            result = { kind: "methodCall", on: result, functionCall }
          },
        },
        {
          ALT: () => {
            this.CONSUME2(TOKEN.DOT)
            const field = this.CONSUME(TOKEN.IDENTIFIER)
            result = { kind: "fieldAccess", on: result, field }
          },
        },
        {
          ALT: () => {
            result = {
              kind: "postfixExpression",
              on: result,
              op: this.CONSUME(TOKEN.POSTFIX_OP),
            }
          },
        },
      ]),
    )
    return result
  })
  //SPEC// invariantQualifier:
  //SPEC//     INVARIANT
  //SPEC// interpolationQualifier:
  //SPEC//     SMOOTH
  //SPEC//     FLAT
  //SPEC// layoutQualifier:
  //SPEC//     LAYOUT LEFT_PAREN layoutQualifierIdList RIGHT_PAREN
  //SPEC// layoutQualifierIdList:
  //SPEC//     layoutQualifierId
  //SPEC//     layoutQualifierIdList COMMA layoutQualifierId
  //SPEC// layoutQualifierId:
  //SPEC//     IDENTIFIER
  //SPEC//     IDENTIFIER EQUAL INTCONSTANT
  //SPEC//     precisionQualifier typeSpecifierNoPrec
  public typeSpecifier = this.RR("typeSpecifier", (): TypeSpecifier => {
    const precisionQualifier = this.OPTION(() =>
      this.SUBRULE(this.precisionQualifier),
    )
    const typeSpecifierNoPrec = this.SUBRULE(this.typeSpecifierNoPrec)
    return Object.assign({}, typeSpecifierNoPrec, { precisionQualifier })
  })
  //SPEC// parameterTypeQualifier:
  //SPEC//     CONST
  //SPEC// typeQualifier:
  //SPEC//     storageQualifier
  //SPEC//     layoutQualifier
  //SPEC//     layoutQualifier storageQualifier
  //SPEC//     interpolationQualifier
  //SPEC//     interpolationQualifier storageQualifier
  //SPEC//     invariantQualifier storageQualifier
  //SPEC//     typeSpecifier
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
  //SPEC// storageQualifier:
  //SPEC//     CONST
  //SPEC//     IN
  //SPEC//     OUT
  //SPEC//     CENTROID IN
  //SPEC//     CENTROID OUT
  //SPEC//     typeQualifier typeSpecifier
  public fullySpecifiedType = this.RR(
    "fullySpecifiedType",
    (): FullySpecifiedType => {
      const typeQualifier = this.OPTION(() => this.SUBRULE(this.typeQualifier))
      const typeSpecifier = this.SUBRULE(this.typeSpecifier)
      return { kind: "fullySpecifiedType", typeQualifier, typeSpecifier }
    },
  )
  //SPEC// typeSpecifier:
  //SPEC//     typeSpecifierNoPrec
  //SPEC//     assignmentExpression
  public initializer = this.RR(
    "initializer",
    (): Expression => this.SUBRULE(this.assignmentExpression),
  )
  //SPEC// typeSpecifierNoPrec:
  //SPEC//     typeSpecifierNonarray
  //SPEC//     typeSpecifierNonarray LEFT_BRACKET RIGHT_BRACKET
  //SPEC//     // GramNote:  No 'enum', or 'typedef'.
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
  //SPEC// typeSpecifierNonarray:
  //SPEC//     VOID
  //SPEC//     FLOAT
  //SPEC//     INT
  //SPEC//     UINT
  //SPEC//     BOOL
  //SPEC//     VEC2
  //SPEC//     VEC3
  //SPEC//     VEC4
  //SPEC//     BVEC2
  //SPEC//     BVEC3
  //SPEC//     BVEC4
  //SPEC//     IVEC2
  //SPEC//     IVEC3
  //SPEC//     IVEC4
  //SPEC//     UVEC2
  //SPEC//     UVEC3
  //SPEC//     UVEC4
  //SPEC//     MAT2
  //SPEC//     MAT3
  //SPEC//     MAT4
  //SPEC//     MAT2X2
  //SPEC//     MAT2X3
  //SPEC//     MAT2X4
  //SPEC//     MAT3X2
  //SPEC//     MAT3X3
  //SPEC//     MAT3X4
  //SPEC//     MAT4X2
  //SPEC//     MAT4X3
  //SPEC//     MAT4X4
  //SPEC//     SAMPLER2D
  //SPEC//     SAMPLER3D
  //SPEC//     SAMPLERCUBE
  //SPEC//     SAMPLER2DSHADOW
  //SPEC//     SAMPLERCUBESHADOW
  //SPEC//     SAMPLER2DARRAY
  //SPEC//     SAMPLER2DARRAYSHADOW
  //SPEC//     ISAMPLER2D
  //SPEC//     ISAMPLER3D
  //SPEC//     ISAMPLERCUBE
  //SPEC//     ISAMPLER2DARRAY
  //SPEC//     USAMPLER2D
  //SPEC//     USAMPLER3D
  //SPEC//     USAMPLERCUBE
  //SPEC//     USAMPLER2DARRAY
  //SPEC//     structSpecifier
  //SPEC//     statementList statement
  public compoundStatement = this.RR(
    "compoundStatement",
    (newScope): CompoundStatement => {
      this.CONSUME(TOKEN.LEFT_BRACE)
      const statements: Statement[] = []
      this.MANY(() => statements.push(this.SUBRULE(this.statement)))
      this.CONSUME(TOKEN.RIGHT_BRACE)
      return { kind: "compoundStatement", statements, newScope }
    },
  )
  //SPEC// precisionQualifier:
  //SPEC//     HIGH_PRECISION
  //SPEC//     MEDIUM_PRECISION
  //SPEC//     typeQualifier SEMICOLON
  public externalDeclaration = this.RR(
    "externalDeclaration",
    (noFunction?: boolean): Declaration =>
      this.OR([
        // initDeclaratorList, functionPrototype or functionDefinition
        {
          ALT: () => {
            const type = this.SUBRULE(this.fullySpecifiedType)
            return this.OR2([
              // functionPrototype
              {
                // GATE: () => !noFunction,
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
                    DEF: () => {
                      const name = this.CONSUME3(TOKEN.IDENTIFIER)
                      const arraySpecifier = this.OPTION5(() =>
                        this.SUBRULE(this.arraySpecifier),
                      )
                      const init = this.OPTION7(() => {
                        this.CONSUME(TOKEN.EQUAL)
                        return this.SUBRULE(this.initializer)
                      })
                      declarators.push({
                        kind: "declarator",
                        name,
                        arraySpecifier,
                        init,
                      })
                    },
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
            return {
              kind: "precisionDeclaration",
              precisionQualifier,
              typeSpecifierNoPrec,
            }
          },
        },
      ]),
  )

  //SPEC// structSpecifier:
  //SPEC//     STRUCT IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE
  //SPEC//     STRUCT LEFT_BRACE structDeclarationList RIGHT_BRACE
  //SPEC//     expression SEMICOLON
  public expressionStatement = this.RR(
    "expressionStatement",
    (): ExpressionStatement => {
      const expression = this.OPTION(() => this.SUBRULE(this.expression))
      this.CONSUME(TOKEN.SEMICOLON)
      return { kind: "expressionStatement", expression }
    },
  )
  //SPEC//     statementWithScope
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
  //SPEC// structDeclarationList:
  //SPEC//     structDeclaration
  //SPEC//     structDeclarationList structDeclaration
  //SPEC// structDeclaration:
  //SPEC//     typeSpecifier structDeclaratorList SEMICOLON
  //SPEC//     typeQualifier typeSpecifier structDeclaratorList SEMICOLON
  //SPEC// structDeclaratorList:
  //SPEC//     structDeclarator
  //SPEC//     structDeclaratorList COMMA structDeclarator
  //SPEC// structDeclarator:
  //SPEC//     IDENTIFIER
  //SPEC//     IDENTIFIER LEFT_BRACKET RIGHT_BRACKET
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

  //SPEC// initializer:
  //SPEC//     statementList
  public switchStatement = this.RR(
    "switchStatement",
    (): SwitchStatement => ({
      kind: "switchStatement",
      SWITCH: this.CONSUME(TOKEN.SWITCH),
      LEFT_PAREN: this.CONSUME(TOKEN.LEFT_PAREN),
      initExpression: this.SUBRULE(this.expression),
      RIGHT_PAREN: this.CONSUME(TOKEN.RIGHT_PAREN),
      body: this.SUBRULE(this.compoundStatement),
    }),
  )
  //SPEC// declarationStatement:
  //SPEC//     declaration
  //SPEC// statement:
  //SPEC//     compoundStatementWithScope
  //SPEC//     simpleStatement
  //SPEC// statementNoNewScope:
  //SPEC//     compoundStatementNoNewScope
  //SPEC//     simpleStatement
  //SPEC// statementWithScope:
  //SPEC//     compoundStatementNoNewScope
  //SPEC//     simpleStatement
  //SPEC// // Grammar Note:  labeled statements for SWITCH only; 'goto' is not supported.
  //SPEC// simpleStatement:
  //SPEC//     declarationStatement
  //SPEC//     expressionStatement
  //SPEC//     selectionStatement
  //SPEC//     switchStatement
  //SPEC//     caseLabel
  //SPEC//     iterationStatement
  //SPEC//     DEFAULT COLON
  public caseLabel = this.RR(
    "caseLabel",
    (): CaseLabel =>
      this.OR([
        {
          ALT: () => {
            this.CONSUME(TOKEN.CASE)
            const _case = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.COLON)
            return { kind: "caseLabel", _case }
          },
        },
        {
          ALT: () => {
            this.CONSUME2(TOKEN.DEFAULT)
            this.CONSUME2(TOKEN.COLON)
            return { kind: "caseLabel", _case: undefined }
          },
        },
      ]),
  )
  //SPEC// compoundStatementWithScope:
  //SPEC//     LEFT_BRACE RIGHT_BRACE
  //SPEC//     LEFT_BRACE statementList RIGHT_BRACE
  //SPEC// compoundStatementNoNewScope:
  //SPEC//     LEFT_BRACE RIGHT_BRACE
  //SPEC//     LEFT_BRACE statementList RIGHT_BRACE
  //SPEC// statementList:
  //SPEC//     statement
  //SPEC//     conditionopt SEMICOLON expression
  public iterationStatement = this.RR(
    "iterationStatement",
    (): IterationStatement =>
      this.OR([
        {
          ALT: (): WhileStatement => ({
            kind: "whileStatement",
            WHILE: this.CONSUME(TOKEN.WHILE),
            LEFT_PAREN: this.CONSUME(TOKEN.LEFT_PAREN),
            conditionExpression: this.SUBRULE(this.condition),
            RIGHT_PAREN: this.CONSUME(TOKEN.RIGHT_PAREN),
            statement: this.SUBRULE(this.statement),
          }),
        },
        {
          ALT: (): DoWhileStatement => ({
            kind: "doWhileStatement",
            DO: this.CONSUME2(TOKEN.DO),
            statement: this.SUBRULE2(this.statement, { ARGS: [true] }),
            WHILE: this.CONSUME2(TOKEN.WHILE),
            LEFT_PAREN: this.CONSUME2(TOKEN.LEFT_PAREN),
            conditionExpression: this.SUBRULE2(this.expression),
            RIGHT_PAREN: this.CONSUME2(TOKEN.RIGHT_PAREN),
            SEMICOLON: this.CONSUME2(TOKEN.SEMICOLON),
          }),
        },
        {
          ALT: (): ForStatement => {
            const FOR = this.CONSUME3(TOKEN.FOR)
            const LEFT_PAREN = this.CONSUME3(TOKEN.LEFT_PAREN)
            let initExpression, SEMICOLON1
            this.OR3([
              {
                GATE: this.BACKTRACK(this.singleDeclaration),
                ALT: () => {
                  initExpression = this.SUBRULE(this.declaration)
                },
              },
              { ALT: () => this.CONSUME1(TOKEN.SEMICOLON) },
              {
                ALT: () => {
                  initExpression = this.SUBRULE3(this.expression)
                  SEMICOLON1 = this.CONSUME3(TOKEN.SEMICOLON)
                },
              },
            ])
            const conditionExpression = this.OPTION3(() =>
              this.SUBRULE3(this.condition),
            )
            const SEMICOLON2 = this.CONSUME4(TOKEN.SEMICOLON)
            const loopExpression = this.OPTION4(() =>
              this.SUBRULE4(this.expression),
            )
            const RIGHT_PAREN = this.CONSUME3(TOKEN.RIGHT_PAREN)
            const statement = this.SUBRULE3(this.statement)
            return {
              kind: "forStatement",
              FOR,
              LEFT_PAREN,
              initExpression,
              SEMICOLON1,
              conditionExpression,
              SEMICOLON2,
              loopExpression,
              RIGHT_PAREN,
              statement,
            }
          },
        },
      ]),
  )
  //SPEC// expressionStatement:
  //SPEC//     SEMICOLON
  //SPEC// // Grammar Note:  No 'goto'.  Gotos are not supported.
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
  //SPEC// selectionStatement:
  //SPEC//     IF LEFT_PAREN expression RIGHT_PAREN selectionRestStatement
  //SPEC// selectionRestStatement:
  //SPEC//     statementWithScope ELSE statementWithScope
  //SPEC//     jumpStatement
  public statement = this.RR(
    "statement",
    (newScope?): Statement =>
      this.OR<Statement>([
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
        // declarationStatement
        {
          GATE: this.BACKTRACK(this.declaration),
          ALT: () =>
            this.SUBRULE(this.declaration, {
              ARGS: [true],
            }) as InitDeclaratorListDeclaration,
        },
        { ALT: () => this.SUBRULE(this.expressionStatement) },
        { ALT: () => this.SUBRULE(this.selectionStatement) },
        { ALT: () => this.SUBRULE(this.switchStatement) },
        { ALT: () => this.SUBRULE(this.caseLabel) },
        { ALT: () => this.SUBRULE(this.iterationStatement) },
        { ALT: () => this.SUBRULE(this.jumpStatement) },
        {
          ALT: () =>
            this.SUBRULE(this.compoundStatement, { ARGS: [!!newScope] }),
        },
      ]),
  )

  //SPEC// condition:
  //SPEC//     expression
  //SPEC//     fullySpecifiedType IDENTIFIER EQUAL initializer
  //SPEC//     declaration
  public translationUnit = this.RR("translationUnit", (): TranslationUnit => {
    const declarations: Declaration[] = []
    this.AT_LEAST_ONE(() =>
      declarations.push(this.SUBRULE(this.externalDeclaration)),
    )
    return { kind: "translationUnit", declarations }
  })
  //SPEC// switchStatement:
  //SPEC//     SWITCH LEFT_PAREN expression RIGHT_PAREN LEFT_BRACE switchStatementList RIGHT_BRACE
  //SPEC// switchStatementList:
  //SPEC//     /* nothing */

  public constructor() {
    super(ALL_TOKENS, { skipValidations: !DEV })

    this.performSelfAnalysis()
  }
  //SPEC// caseLabel:
  //SPEC//     CASE expression COLON

  public reset() {
    super.reset()
  }
  //SPEC// iterationStatement:
  //SPEC//     WHILE LEFT_PAREN condition RIGHT_PAREN statementNoNewScope
  //SPEC//     DO statementWithScope WHILE LEFT_PAREN expression RIGHT_PAREN SEMICOLON
  //SPEC//     FOR LEFT_PAREN forInitStatement forRestStatement RIGHT_PAREN statementNoNewScope
  //SPEC// forInitStatement:
  //SPEC//     expressionStatement
  //SPEC//     declarationStatement
  //SPEC// conditionopt:
  //SPEC//     condition
  //SPEC//     /* empty */
  //SPEC// forRestStatement:
  //SPEC//     conditionopt SEMICOLON

  protected LEFT_ASSOC(rule: (idx: number) => Expression, tok: TokenType) {
    let result = this.SUBRULE1(rule)
    this.MANY(
      this.ANNOTATE(() => {
        const op = this.CONSUME(tok)
        const rhs = this.SUBRULE2(rule)
        result = { kind: "binaryExpression", lhs: result, rhs, op }
        return result
      }),
    )
    return result
  }
  //SPEC// jumpStatement:
  //SPEC//     CONTINUE SEMICOLON
  //SPEC//     BREAK SEMICOLON
  //SPEC//     RETURN SEMICOLON
  //SPEC//     RETURN expression SEMICOLON
  //SPEC//     DISCARD SEMICOLON   // Fragment shader only.

  protected ANNOTATE<T extends Node | IToken>(
    implementation: (...implArgs: any[]) => T,
  ): (...implArgs: any[]) => T {
    return (...args) => {
      const parentChildren = this.currentChildren
      this.currentChildren = []
      const firstToken = this.LA(1)
      try {
        const result = implementation(args)
        if (!this.RECORDING_PHASE && !this.backtracking && result) {
          if ("kind" in result && !result.firstToken) {
            result.firstToken = firstToken
            result.lastToken = this.LA(0)
            result.children = this.currentChildren
            parentChildren?.push(result as any)
          } else {
            parentChildren.push(...this.currentChildren)
          }
        }
        return result
      } finally {
        this.currentChildren = parentChildren
      }
    }
  }
  //SPEC// translationUnit:
  //SPEC//     externalDeclaration
  //SPEC//     translationUnit externalDeclaration
  //SPEC// externalDeclaration:
  //SPEC//     functionDefinition

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
  //SPEC// functionDefinition:
  //SPEC//     functionPrototype compoundStatementNoNewScope

  protected RR<T extends Node | IToken>(
    name: string,
    implementation: (...implArgs: any[]) => T,
    config?: IRuleConfig<T>,
  ): (idxInCallingRule?: number, ...args: any[]) => T {
    return super.RULE(name, this.ANNOTATE(implementation), config)
  }
}

// ONLY ONCE
export const GLSL_PARSER = new GLSLParser()

function checkLexingErrors(input: string, lexingResult: ILexingResult) {
  if (lexingResult.errors.length) {
    throw new Error(
      "LEXER ERROR: " +
        lexingResult.errors
          .map(
            (e) =>
              e.message +
              ":\n" +
              substrContext(input, {
                startLine: e.line,
                startColumn: e.column,
                endLine: e.line,
                endColumn: e.column + e.length,
              }),
          )
          // .map((e) => e.message)
          .join(),
    )
  }
}

function checkParsingErrors(input: string, errors: IRecognitionException[]) {
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
              substrContext(input, e.token),
          )
          .join("\n"),
    )
  }
}

export function parseInput(text: string): TranslationUnit {
  const lexingResult = GLSL_LEXER.tokenize(text)
  checkLexingErrors(text, lexingResult)

  const errors = []

  function markError(where: IToken, err: string, msg?: string) {
    errors.push({ where, err, msg })
  }

  for (const token of lexingResult.tokens) {
    if (token.tokenType === TOKEN.IDENTIFIER) {
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

  // "input" is a setter which will reset the glslParser's state.
  GLSL_PARSER.input = lexingResult.tokens
  const result = GLSL_PARSER.translationUnit()
  checkParsingErrors(text, GLSL_PARSER.errors)

  result.comments = lexingResult.groups.COMMENTS
  return result
}
