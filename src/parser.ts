import {
  CaseLabel,
  CompoundStatement,
  Declaration,
  Declarator,
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
} from "./nodes"
import { ALL_TOKENS, TOKEN } from "./lexer"

import { EmbeddedActionsParser, IToken, TokenType } from "chevrotain"
import { DEV } from "./util"

export type CstNode = Node

class GLSLParser extends EmbeddedActionsParser {
  currIdx!: number

  LEFT_ASSOC(rule: (idx: number) => Expression, tok: TokenType) {
    let result = this.SUBRULE1(rule)
    this.MANY(
      this.ANNOTATE(() => {
        const op = this.CONSUME(tok)
        const rhs = this.SUBRULE2(rule)
        result = { type: "binaryExpression", lhs: result, rhs, op }
      }),
    )
    return result
  }

  foo: (CstNode | Token)[] = []

  ANNOTATE<T>(
    implementation: (...implArgs: any[]) => T,
  ): (...implArgs: any[]) => T {
    return (...args) => {
      const firstToken = this.currIdx
      const fooStart = this.foo.length
      const result = implementation(args)
      if (
        !this.RECORDING_PHASE &&
        result &&
        (result as any).type &&
        !(result as any).firstToken
      ) {
        ;(result as any).firstToken = firstToken
        ;(result as any).lastToken = this.currIdx - 1
        ;(result as any).children = this.foo.slice(fooStart)
        // this.foo.length = fooStart
        // this.foo.push(result as any)
      }
      return result
    }
  }

  reset() {
    this.foo = []
  }

  //SPEC// variableIdentifier:
  //SPEC//     IDENTIFIER
  //SPEC// primaryExpression:
  //SPEC//     variableIdentifier
  //SPEC//     INTCONSTANT
  //SPEC//     UINTCONSTANT
  //SPEC//     FLOATCONSTANT
  //SPEC//     BOOLCONSTANT
  //SPEC//     LEFT_PAREN expression RIGHT_PAREN
  primaryExpression = this.RULE(
    "primaryExpression",
    (): Expression =>
      this.OR([
        {
          ALT: () => {
            this.CONSUME(TOKEN.LEFT_PAREN)
            const result = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.RIGHT_PAREN)
            return result
          },
        },
        { ALT: () => this.CONSUME(TOKEN.IDENTIFIER) },
        { ALT: () => this.CONSUME(TOKEN.INTCONSTANT) },
        { ALT: () => this.CONSUME(TOKEN.UINTCONSTANT) },
        { ALT: () => this.CONSUME(TOKEN.FLOATCONSTANT) },
        { ALT: () => this.CONSUME(TOKEN.BOOLCONSTANT) },
      ]),
  )
  //SPEC// postfixExpression:
  //SPEC//     primaryExpression
  //SPEC//     postfixExpression LEFT_BRACKET integerExpression RIGHT_BRACKET
  //SPEC//     functionCall
  //SPEC//     postfixExpression DOT FIELD_SELECTION
  //SPEC//     postfixExpression INC_OP
  //SPEC//     postfixExpression DEC_OP
  // We add postfixExpression DOT functionCall.
  postfixExpression = this.RULE(
    "postfixExpression",
    (): Expression =>
      this.OR1([
        {
          GATE: this.BACKTRACK(this.functionCallHeader),
          ALT: () => this.SUBRULE1(this.functionCall),
        },
        {
          ALT: () => {
            let result = this.SUBRULE(this.primaryExpression)
            this.MANY(() =>
              this.OR2([
                {
                  ALT: () => {
                    this.CONSUME(TOKEN.LEFT_BRACKET)
                    const index = this.SUBRULE(this.expression)
                    this.CONSUME(TOKEN.RIGHT_BRACKET)
                    result = { type: "arrayAccess", on: result, index }
                  },
                },
                {
                  ALT: () => {
                    this.CONSUME1(TOKEN.DOT)
                    const functionCall = this.SUBRULE2(this.functionCall)
                    result = { type: "methodCall", on: result, functionCall }
                  },
                },
                {
                  ALT: () => {
                    this.CONSUME2(TOKEN.DOT)
                    const field = this.CONSUME(TOKEN.IDENTIFIER)
                    result = { type: "fieldAccess", on: result, field }
                  },
                },
                {
                  ALT: () => {
                    result = {
                      type: "postfixExpression",
                      on: result,
                      op: this.CONSUME(TOKEN.INC_OP),
                    }
                  },
                },
                {
                  ALT: () => {
                    result = {
                      type: "postfixExpression",
                      on: result,
                      op: this.CONSUME(TOKEN.DEC_OP),
                    }
                  },
                },
              ]),
            )
            return result
          },
        },
      ]),
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
  //SPEC//     FIELD_SELECTION
  functionCall = this.RULE("functionCall", (): FunctionCall => {
    const what = this.SUBRULE(this.typeSpecifierNoPrec)
    this.CONSUME(TOKEN.LEFT_PAREN)
    const args: Expression[] = []
    this.MANY_SEP({
      DEF: () => args.push(this.SUBRULE(this.assignmentExpression)),
      SEP: TOKEN.COMMA,
    })
    this.CONSUME(TOKEN.RIGHT_PAREN)
    return { type: "functionCall", what, args }
  })
  // used for lookahead
  functionCallHeader = this.RULE("functionCallHeader", (): void => {
    this.SUBRULE(this.typeSpecifierNoPrec)
    this.CONSUME(TOKEN.LEFT_PAREN)
  })
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
  //SPEC//     // GramNote:  No '*' or '&' unary ops.  Pointers are not supported.
  unaryExpression = this.RULE(
    "unaryExpression",
    (): Expression =>
      this.OR([
        { ALT: () => this.SUBRULE1(this.postfixExpression) },
        {
          ALT: () => {
            const op = this.CONSUME(TOKEN.PREFIX_OP)
            const of = this.SUBRULE2(this.unaryExpression)
            return { type: "prefixExpression", op, of }
          },
        },
      ]),
  )
  //SPEC// multiplicativeExpression:
  //SPEC//     unaryExpression
  //SPEC//     multiplicativeExpression STAR unaryExpression
  //SPEC//     multiplicativeExpression SLASH unaryExpression
  //SPEC//     multiplicativeExpression PERCENT unaryExpression
  multiplicativeExpression = this.RULE(
    "multiplicativeExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.unaryExpression, TOKEN.MULTIPLICATIVE_OP),
  )
  //SPEC// additiveExpression:
  //SPEC//     multiplicativeExpression
  //SPEC//     additiveExpression PLUS multiplicativeExpression
  //SPEC//     additiveExpression DASH multiplicativeExpression
  additiveExpression = this.RULE(
    "additiveExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.multiplicativeExpression, TOKEN.ADDITIVE_OP),
  )
  //SPEC// shiftExpression:
  //SPEC//     additiveExpression
  //SPEC//     shiftExpression LEFT_OP additiveExpression
  //SPEC//     shiftExpression RIGHT_OP additiveExpression
  shiftExpression = this.RULE(
    "shiftExpression",
    (): Expression => this.LEFT_ASSOC(this.additiveExpression, TOKEN.SHIFT_OP),
  )
  //SPEC// relationalExpression:
  //SPEC//     shiftExpression
  //SPEC//     relationalExpression LEFT_ANGLE shiftExpression
  //SPEC//     relationalExpression RIGHT_ANGLE shiftExpression
  //SPEC//     relationalExpression LE_OP shiftExpression
  //SPEC//     relationalExpression GE_OP shiftExpression
  relationalExpression = this.RULE(
    "relationalExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.shiftExpression, TOKEN.RELATIONAL_OP),
  )
  //SPEC// equalityExpression:
  //SPEC//     relationalExpression
  //SPEC//     equalityExpression EQ_OP relationalExpression
  //SPEC//     equalityExpression NE_OP relationalExpression
  equalityExpression = this.RULE(
    "equalityExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.relationalExpression, TOKEN.EQUALITY_OP),
  )
  //SPEC// andExpression:
  //SPEC//     equalityExpression
  //SPEC//     andExpression AMPERSAND equalityExpression
  andExpression = this.RULE(
    "andExpression",
    (): Expression => this.LEFT_ASSOC(this.equalityExpression, TOKEN.AMPERSAND),
  )
  //SPEC// exclusiveOrExpression:
  //SPEC//     andExpression
  //SPEC//     exclusiveOrExpression CARET andExpression
  exclusiveOrExpression = this.RULE(
    "exclusiveOrExpression",
    (): Expression => this.LEFT_ASSOC(this.andExpression, TOKEN.CARET),
  )
  //SPEC// inclusiveOrExpression:
  //SPEC//     exclusiveOrExpression
  //SPEC//     inclusiveOrExpression VERTICALBAR exclusiveOrExpression
  inclusiveOrExpression = this.RULE(
    "inclusiveOrExpression",
    (): Expression =>
      this.LEFT_ASSOC(this.exclusiveOrExpression, TOKEN.VERTICALBAR),
  )
  //SPEC// logicalAndExpression:
  //SPEC//     inclusiveOrExpression
  //SPEC//     logicalAndExpression AND_OP inclusiveOrExpression
  logicalAndExpression = this.RULE(
    "logicalAndExpression",
    (): Expression => this.LEFT_ASSOC(this.inclusiveOrExpression, TOKEN.AND_OP),
  )
  //SPEC// logicalXorExpression:
  //SPEC//     logicalAndExpression
  //SPEC//     logicalXorExpression XOR_OP logicalAndExpression
  logicalXorExpression = this.RULE(
    "logicalXorExpression",
    (): Expression => this.LEFT_ASSOC(this.logicalAndExpression, TOKEN.XOR_OP),
  )
  //SPEC// logicalOrExpression:
  //SPEC//     logicalXorExpression
  //SPEC//     logicalOrExpression OR_OP logicalXorExpression
  logicalOrExpression = this.RULE(
    "logicalOrExpression",
    (): Expression => this.LEFT_ASSOC(this.logicalXorExpression, TOKEN.OR_OP),
  )
  //SPEC// conditionalExpression:
  //SPEC//     logicalOrExpression
  //SPEC//     logicalOrExpression QUESTION expression COLON assignmentExpression
  conditionalExpression = this.RULE("conditionalExpression", (): Expression => {
    const lhs = this.SUBRULE1(this.logicalOrExpression)

    return (
      this.OPTION(() => ({
        type: "conditionalExpression",
        condition: lhs,
        QUESTION: this.CONSUME(TOKEN.QUESTION),
        yes: this.SUBRULE2(this.expression),
        COLON: this.CONSUME(TOKEN.COLON),
        no: this.SUBRULE3(this.assignmentExpression),
      })) || lhs
    )
  })
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
  // and do semantic check later.
  assignmentExpression = this.RULE("assignmentExpression", (): Expression => {
    let result = this.SUBRULE(this.conditionalExpression)
    this.MANY(
      this.ANNOTATE(() => {
        const op = this.CONSUME(TOKEN.ASSIGN_OP)
        const rhs = this.SUBRULE1(this.conditionalExpression)
        return (result = {
          type: "assignmentExpression",
          lhs: result,
          op,
          rhs,
        })
      }),
    )
    return result
  })
  //SPEC// expression:
  //SPEC//     assignmentExpression
  //SPEC//     expression COMMA assignmentExpression
  expression = this.RULE("expression", (): Expression => {
    let result!: Expression
    this.AT_LEAST_ONE_SEP({
      SEP: TOKEN.COMMA,
      DEF: () => {
        const rhs = this.SUBRULE(this.assignmentExpression)
        return (result = !result
          ? rhs
          : { type: "commaExpression", lhs: result, rhs })
      },
    })
    return result
  })
  //SPEC// constantExpression:
  //SPEC//     conditionalExpression
  constantExpression = this.RULE(
    "constantExpression",
    (): Expression => this.SUBRULE(this.conditionalExpression),
  )
  //SPEC// declaration:
  //SPEC//     functionPrototype SEMICOLON
  //SPEC//     initDeclaratorList SEMICOLON
  //SPEC//     PRECISION precisionQualifier typeSpecifierNoPrec SEMICOLON
  //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE SEMICOLON
  //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER SEMICOLON
  //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER LEFT_BRACKET
  //SPEC//                                                      constantExpression RIGHT_BRACKET SEMICOLON
  //SPEC//     typeQualifier SEMICOLON
  externalDeclaration = this.RULE(
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
                          type: "functionPrototype",
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
                          type: "functionDefinition",
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
                      const arrayInit = this.OPTION5(() => {
                        this.CONSUME(TOKEN.LEFT_BRACKET)
                        const expr = this.OPTION6(() =>
                          this.SUBRULE(this.constantExpression),
                        )
                        this.CONSUME(TOKEN.RIGHT_BRACKET)
                        return { type: "arrayInit", expr }
                      })
                      const init = this.OPTION7(() => {
                        this.CONSUME(TOKEN.EQUAL)
                        return this.SUBRULE(this.initializer)
                      })
                      declarators.push({
                        type: "declarator",
                        name,
                        arrayInit,
                        init,
                      })
                    },
                  })
                  this.CONSUME2(TOKEN.SEMICOLON)
                  return {
                    type: "initDeclaratorListDeclaration",
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
              type: "precisionDeclaration",
              precisionQualifier,
              typeSpecifierNoPrec,
            }
          },
        },
      ]),
  )
  declaration = this.RULE(
    "declaration",
    (): Declaration => this.SUBRULE(this.externalDeclaration, { ARGS: [true] }),
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
  //SPEC//     typeSpecifier
  parameterDeclaration = this.RULE(
    "parameterDeclaration",
    (): ParameterDeclaration => {
      //     constQualifier
      const parameterTypeQualifier = this.OPTION(() =>
        this.CONSUME(TOKEN.CONST),
      )
      //     parameterQualifier
      const parameterQualifier = this.OPTION1(() =>
        this.OR4([
          { ALT: () => this.CONSUME(TOKEN.IN) },
          { ALT: () => this.CONSUME(TOKEN.OUT) },
          { ALT: () => this.CONSUME(TOKEN.INOUT) },
        ]),
      )

      const typeSpecifier = this.SUBRULE(this.typeSpecifier)
      let pName, arrayInit
      this.OPTION2(() => {
        pName = this.CONSUME2(TOKEN.IDENTIFIER)
        //arraySpecifier
        this.OPTION3(() => {
          this.CONSUME4(TOKEN.LEFT_BRACKET)
          arrayInit = this.CONSUME(TOKEN.INTCONSTANT)
          this.CONSUME4(TOKEN.RIGHT_BRACKET)
        })
      })
      return {
        type: "parameterDeclaration",
        parameterTypeQualifier,
        pName,
        arrayInit,
        parameterQualifier,
        typeSpecifier,
      }
    },
  )

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
  //SPEC//     // GramNote:  No 'enum', or 'typedef'.
  singleDeclaration = this.RULE("singleDeclaration", (): void =>
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
          type: "invariantDeclaration",
          INVARIANT: this.CONSUME(TOKEN.INVARIANT),
          IDENTIFIER: this.CONSUME2(TOKEN.IDENTIFIER),
        }),
      },
    ]),
  )
  //SPEC// fullySpecifiedType:
  //SPEC//     typeSpecifier
  //SPEC//     typeQualifier typeSpecifier
  fullySpecifiedType = this.RULE(
    "fullySpecifiedType",
    (): FullySpecifiedType => {
      const typeQualifier = this.OPTION(() => this.SUBRULE(this.typeQualifier))
      const typeSpecifier = this.SUBRULE(this.typeSpecifier)
      return { type: "fullySpecifiedType", typeQualifier, typeSpecifier }
    },
  )
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
  //SPEC//     IDENTIFIER EQUAL UINTCONSTANT
  layoutQualifier = this.RULE("layoutQualifier", (): LayoutQualifier => {
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
    return { type: "layoutQualifier", layoutQualifierIds }
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
  //SPEC//     invariantQualifier interpolationQualifier storageQualifier
  typeQualifier = this.RULE("typeQualifier", (): TypeQualifier => {
    let storageQualifier,
      layoutQualifier,
      interpolationQualifier,
      invariantQualifier
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
      type: "typeQualifier",
      storageQualifier,
      layoutQualifier,
      interpolationQualifier,
      invariantQualifier,
    }
  })
  //SPEC// storageQualifier:
  //SPEC//     CONST
  //SPEC//     IN
  //SPEC//     OUT
  //SPEC//     CENTROID IN
  //SPEC//     CENTROID OUT
  //SPEC//     UNIFORM
  storageQualifier = this.RULE("storageQualifier", (): StorageQualifier => {
    let CONST, CENTROID, IN, OUT, UNIFORM
    this.OR([
      { ALT: () => this.CONSUME(TOKEN.CONST) },
      {
        ALT: () => {
          this.OPTION(() => this.CONSUME(TOKEN.CENTROID))
          this.OR9([
            { ALT: () => this.CONSUME(TOKEN.IN) },
            { ALT: () => this.CONSUME(TOKEN.OUT) },
          ])
        },
      },
      { ALT: () => this.CONSUME(TOKEN.UNIFORM) },
    ])
    return { type: "storageQualifier", CONST, CENTROID, IN, OUT, UNIFORM }
  })
  //SPEC// typeSpecifier:
  //SPEC//     typeSpecifierNoPrec
  //SPEC//     precisionQualifier typeSpecifierNoPrec
  typeSpecifier = this.RULE("typeSpecifier", (): TypeSpecifier => {
    const precisionQualifier = this.OPTION(() =>
      this.SUBRULE(this.precisionQualifier),
    )
    const typeSpecifierNoPrec = this.SUBRULE(this.typeSpecifierNoPrec)
    return Object.assign({}, typeSpecifierNoPrec, { precisionQualifier })
  })
  //SPEC// typeSpecifierNoPrec:
  //SPEC//     typeSpecifierNonarray
  //SPEC//     typeSpecifierNonarray LEFT_BRACKET RIGHT_BRACKET
  //SPEC//     typeSpecifierNonarray LEFT_BRACKET constantExpression RIGHT_BRACKET
  typeSpecifierNoPrec = this.RULE("typeSpecifierNoPrec", (): TypeSpecifier => {
    const typeSpecifierNonArray = this.SUBRULE(this.typeSpecifierNonArray)
    const arraySpecifier = this.OPTION1(() => {
      this.CONSUME(TOKEN.LEFT_BRACKET)
      const size = this.OPTION2(() => this.SUBRULE(this.constantExpression))
      this.CONSUME(TOKEN.RIGHT_BRACKET)
      return { type: "arrayInit", size }
    })
    return {
      type: "typeSpecifier",
      precisionQualifier: undefined,
      arraySpecifier,
      typeSpecifierNonArray,
    }
  })
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
  //SPEC//     TYPE_NAME
  typeSpecifierNonArray = this.RULE(
    "typeSpecifierNonArray",
    (): IToken | StructSpecifier =>
      this.OR([
        { ALT: () => this.CONSUME(TOKEN.BASIC_TYPE) },
        { ALT: () => this.CONSUME(TOKEN.VOID) },
        { ALT: () => this.SUBRULE(this.structSpecifier) },
        { ALT: () => this.CONSUME(TOKEN.IDENTIFIER) },
      ]),
  )
  //SPEC// precisionQualifier:
  //SPEC//         HIGH_PRECISION
  //SPEC//         MEDIUM_PRECISION
  //SPEC//         LOW_PRECISION
  precisionQualifier = this.RULE(
    "precisionQualifier",
    (): IToken => this.CONSUME(TOKEN.PRECISION_QUALIFIER),
  )

  //SPEC// structSpecifier:
  //SPEC//         STRUCT IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE
  //SPEC//         STRUCT LEFT_BRACE structDeclarationList RIGHT_BRACE

  structSpecifier = this.RULE("structSpecifier", (): StructSpecifier => {
    this.CONSUME(TOKEN.STRUCT)
    const name = this.OPTION2(() => this.CONSUME(TOKEN.IDENTIFIER))
    this.CONSUME(TOKEN.LEFT_BRACE)
    const declarations = this.SUBRULE(this.structDeclarationList)
    this.CONSUME(TOKEN.RIGHT_BRACE)
    return { type: "structSpecifier", name, declarations }
  })
  //SPEC// structDeclarationList:
  //SPEC//         structDeclaration
  //SPEC//         structDeclarationList structDeclaration
  //SPEC// structDeclaration:
  //SPEC//         typeSpecifier structDeclaratorList SEMICOLON
  //SPEC//         typeQualifier typeSpecifier structDeclaratorList SEMICOLON
  //SPEC// structDeclaratorList:
  //SPEC//         structDeclarator
  //SPEC//         structDeclaratorList COMMA structDeclarator
  //SPEC// structDeclarator:
  //SPEC//         IDENTIFIER
  //SPEC//         IDENTIFIER LEFT_BRACKET RIGHT_BRACKET
  //SPEC//         IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
  structDeclarationList = this.RULE(
    "structDeclarationList",
    (): StructDeclaration[] => {
      const result: StructDeclaration[] = []
      this.MANY(() => {
        const fsType = this.SUBRULE(this.fullySpecifiedType)
        const declarators: { name: Token }[] = []
        this.MANY_SEP({
          SEP: TOKEN.COMMA,
          DEF: () => ({
            name: this.CONSUME(TOKEN.IDENTIFIER),
            arrayInit: this.OPTION2(() => {
              this.CONSUME(TOKEN.LEFT_BRACKET)
              this.OPTION3(() => this.SUBRULE(this.constantExpression))
              this.CONSUME(TOKEN.RIGHT_BRACKET)
            }),
          }),
        })
        this.CONSUME(TOKEN.SEMICOLON)
        result.push({
          type: "structDeclaration",
          fsType,
          declarators,
        })
      })
      return result
    },
  )

  //SPEC// initializer:
  //SPEC//         assignmentExpression
  initializer = this.RULE(
    "initializer",
    (): Expression => this.SUBRULE(this.assignmentExpression),
  )
  //SPEC// declarationStatement:
  //SPEC//         declaration
  //SPEC// statement:
  //SPEC//         compoundStatementWithScope
  //SPEC//         simpleStatement
  //SPEC// statementNoNewScope:
  //SPEC//         compoundStatementNoNewScope
  //SPEC//         simpleStatement
  //SPEC// statementWithScope:
  //SPEC//         compoundStatementNoNewScope
  //SPEC//         simpleStatement
  //SPEC// // Grammar Note:  labeled statements for SWITCH only; 'goto' is not supported.
  //SPEC// simpleStatement:
  //SPEC//         declarationStatement
  //SPEC//         expressionStatement
  //SPEC//         selectionStatement
  //SPEC//         switchStatement
  //SPEC//         caseLabel
  //SPEC//         iterationStatement
  //SPEC//         jumpStatement
  statement = this.RULE(
    "statement",
    (): Statement =>
      this.OR<Statement>([
        // declarationStatement
        {
          GATE: this.BACKTRACK(this.singleDeclaration),
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
        { ALT: () => this.SUBRULE(this.compoundStatement) },
      ]),
  )
  //SPEC// compoundStatementWithScope:
  //SPEC//         LEFT_BRACE RIGHT_BRACE
  //SPEC//         LEFT_BRACE statementList RIGHT_BRACE
  //SPEC// compoundStatementNoNewScope:
  //SPEC//         LEFT_BRACE RIGHT_BRACE
  //SPEC//         LEFT_BRACE statementList RIGHT_BRACE
  //SPEC// statementList:
  //SPEC//         statement
  //SPEC//         statementList statement
  compoundStatement = this.RULE("compoundStatement", (): CompoundStatement => {
    this.CONSUME(TOKEN.LEFT_BRACE)
    const statements: Statement[] = []
    this.MANY(() => statements.push(this.SUBRULE(this.statement)))
    this.CONSUME(TOKEN.RIGHT_BRACE)
    return { type: "compoundStatement", statements }
  })
  //SPEC// expressionStatement:
  //SPEC//         SEMICOLON
  //SPEC//         expression SEMICOLON
  expressionStatement = this.RULE(
    "expressionStatement",
    (): ExpressionStatement => {
      return {
        type: "expressionStatement",
        expression: this.OPTION(() => this.SUBRULE(this.expression)),
        SEMICOLON: this.CONSUME(TOKEN.SEMICOLON),
      }
    },
  )
  //SPEC// selectionStatement:
  //SPEC//         IF LEFT_PAREN expression RIGHT_PAREN selectionRestStatement
  //SPEC// selectionRestStatement:
  //SPEC//         statementWithScope ELSE statementWithScope
  //SPEC//         statementWithScope
  selectionStatement = this.RULE(
    "selectionStatement",
    (): SelectionStatement => {
      const IF = this.CONSUME(TOKEN.IF)
      const LEFT_PAREN = this.CONSUME(TOKEN.LEFT_PAREN)
      const condition = this.SUBRULE(this.expression)
      const RIGHT_PAREN = this.CONSUME(TOKEN.RIGHT_PAREN)
      const yes = this.SUBRULE2(this.statement)
      let ELSE, no
      this.OPTION(() => {
        ELSE = this.CONSUME(TOKEN.ELSE)
        this.SUBRULE3(this.statement)
      })
      return {
        type: "selectionStatement",
        IF,
        LEFT_PAREN,
        condition,
        RIGHT_PAREN,
        yes,
        ELSE,
        no,
      }
    },
  )

  //SPEC// condition:
  //SPEC//         expression
  //SPEC//         fullySpecifiedType IDENTIFIER EQUAL initializer
  // simplify to expression | declaration and check in checker
  condition = this.RULE(
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
                type: "initDeclaratorListDeclaration",
                fsType,
                declarators: [
                  { type: "declarator", name, init, arrayInit: undefined },
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
  //SPEC// switchStatement:
  //SPEC//         SWITCH LEFT_PAREN expression RIGHT_PAREN LEFT_BRACE switchStatementList RIGHT_BRACE
  //SPEC// switchStatementList:
  //SPEC//         /* nothing */
  //SPEC//         statementList
  switchStatement = this.RULE(
    "switchStatement",
    (): SwitchStatement => ({
      type: "switchStatement",
      SWITCH: this.CONSUME(TOKEN.SWITCH),
      LEFT_PAREN: this.CONSUME(TOKEN.LEFT_PAREN),
      initExpression: this.SUBRULE(this.expression),
      RIGHT_PAREN: this.CONSUME(TOKEN.RIGHT_PAREN),
      body: this.SUBRULE(this.compoundStatement),
    }),
  )
  //SPEC// caseLabel:
  //SPEC//         CASE expression COLON
  //SPEC//         DEFAULT COLON
  caseLabel = this.RULE(
    "caseLabel",
    (): CaseLabel =>
      this.OR([
        {
          ALT: () => {
            this.CONSUME(TOKEN.CASE)
            const _case = this.SUBRULE(this.expression)
            this.CONSUME(TOKEN.COLON)
            return { type: "caseLabel", _case }
          },
        },
        {
          ALT: () => {
            this.CONSUME2(TOKEN.DEFAULT)
            this.CONSUME2(TOKEN.COLON)
            return { type: "caseLabel", _case: undefined }
          },
        },
      ]),
  )
  //SPEC// iterationStatement:
  //SPEC//         WHILE LEFT_PAREN condition RIGHT_PAREN statementNoNewScope
  //SPEC//         DO statementWithScope WHILE LEFT_PAREN expression RIGHT_PAREN SEMICOLON
  //SPEC//         FOR LEFT_PAREN forInitStatement forRestStatement RIGHT_PAREN
  //SPEC// statementNoNewScope
  //SPEC// forInitStatement:
  //SPEC//         expressionStatement
  //SPEC//         declarationStatement
  //SPEC// conditionopt:
  //SPEC//         condition
  //SPEC//         /* empty */
  //SPEC// forRestStatement:
  //SPEC//         conditionopt SEMICOLON
  //SPEC//         conditionopt SEMICOLON expression
  iterationStatement = this.RULE(
    "iterationStatement",
    (): IterationStatement =>
      this.OR([
        {
          ALT: () => ({
            type: "whileStatement",
            WHILE: this.CONSUME(TOKEN.WHILE),
            LEFT_PAREN: this.CONSUME(TOKEN.LEFT_PAREN),
            condition: this.SUBRULE(this.condition),
            RIGHT_PAREN: this.CONSUME(TOKEN.RIGHT_PAREN),
            statement: this.SUBRULE(this.statement),
          }),
        },
        {
          ALT: () => ({
            type: "doWhileStatement",
            DO: this.CONSUME2(TOKEN.DO),
            statement: this.SUBRULE2(this.statement),
            WHILE: this.CONSUME2(TOKEN.WHILE),
            LEFT_PAREN: this.CONSUME2(TOKEN.LEFT_PAREN),
            expression: this.SUBRULE2(this.expression),
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
              type: "forStatement",
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
  //SPEC// jumpStatement:
  //SPEC//         CONTINUE SEMICOLON
  //SPEC//         BREAK SEMICOLON
  //SPEC//         RETURN SEMICOLON
  //SPEC//         RETURN expression SEMICOLON
  //SPEC//         DISCARD SEMICOLON   // Fragment shader only.
  //SPEC// // Grammar Note:  No 'goto'.  Gotos are not supported.
  jumpStatement = this.RULE("jumpStatement", (): JumpStatement => {
    const result: JumpStatement = this.OR([
      {
        ALT: () => {
          this.CONSUME(TOKEN.CONTINUE)
          return { type: "continueStatement" }
        },
      },
      {
        ALT: () => {
          this.CONSUME(TOKEN.BREAK)
          return { type: "breakStatement" }
        },
      },
      {
        ALT: () => {
          this.CONSUME(TOKEN.DISCARD)
          return { type: "discardStatement" }
        },
      },
      {
        ALT: () => {
          this.CONSUME(TOKEN.RETURN)
          const what = this.OPTION(() => this.SUBRULE(this.expression))
          return { type: "returnStatement", what }
        },
      },
    ])
    this.CONSUME(TOKEN.SEMICOLON)
    return result
  })
  //SPEC// translationUnit:
  //SPEC//         externalDeclaration
  //SPEC//         translationUnit externalDeclaration
  //SPEC// externalDeclaration:
  //SPEC//         functionDefinition
  //SPEC//         declaration
  translationUnit = this.RULE("translationUnit", (): TranslationUnit => {
    const declarations: Declaration[] = []
    this.AT_LEAST_ONE(() =>
      declarations.push(this.SUBRULE(this.externalDeclaration)),
    )
    return { type: "translationUnit", declarations }
  })
  //SPEC// functionDefinition:
  //SPEC//         functionPrototype compoundStatementNoNewScope

  constructor() {
    super(ALL_TOKENS, { skipValidations: !DEV })

    this.performSelfAnalysis()
  }
}

// ONLY ONCE
export const GLSL_PARSER = new GLSLParser()
