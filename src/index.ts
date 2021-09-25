// noinspection JSUnusedGlobalSymbols

import * as path from "path"
import * as fs from "fs"

import {
  createSyntaxDiagramsCode,
  createToken,
  EmbeddedActionsParser,
  ILexingResult,
  IRecognitionException,
  IRuleConfig,
  IToken,
  Lexer,
  TokenType,
} from "chevrotain"
import "colors"
import { pull } from "lodash"
import prettier from "prettier"

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
import * as prettierPlugin from "./prettier-plugin"

const DEV = process.env.NODE_ENV !== "production"

// noinspection JSUnusedGlobalSymbols
namespace TOKEN {
  // Categories

  export const ASSIGN_OP = createToken({ name: "ASSIGN_OP", pattern: Lexer.NA })
  export const PREFIX_OP = createToken({ name: "PREFIX_OP", pattern: Lexer.NA })
  export const PRECISION_QUALIFIER = createToken({
    name: "PRECISION_QUALIFIER",
    pattern: Lexer.NA,
  })
  export const INTERPOLATION_QUALIFIER = createToken({
    name: "INTERPOLATION_QUALIFIER",
    pattern: Lexer.NA,
  })
  export const MULTIPLICATIVE_OP = createToken({
    name: "MULTIPLICATIVE_OP",
    pattern: Lexer.NA,
  })
  export const ADDITIVE_OP = createToken({
    name: "ADDITIVE_OP",
    pattern: Lexer.NA,
  })
  export const SHIFT_OP = createToken({ name: "SHIFT_OP", pattern: Lexer.NA })
  export const RELATIONAL_OP = createToken({
    name: "RELATIONAL_OP",
    pattern: Lexer.NA,
  })
  export const EQUALITY_OP = createToken({
    name: "EQUALITY_OP",
    pattern: Lexer.NA,
  })
  export const PARAMETER_QUALIFIER = createToken({
    name: "PARAMETER_QUALIFIER",
    pattern: Lexer.NA,
  })

  export const WHITESPACE = createToken({
    name: "WHITESPACE",
    pattern: /\s+/,
    group: Lexer.SKIPPED,
  })
  export const LINE_COMMENT = createToken({
    name: "LINE_COMMENT",
    pattern: /\/\/[^\r\n]*/,
    group: "COMMENTS",
  })
  export const MULTILINE_COMMENT = createToken({
    name: "MULTILINE_COMMENT",
    pattern: /\/\*[\s\S]*?\*\//,
    group: "COMMENTS",
  })
  export const PREPROC = createToken({
    name: "PREPROC",
    pattern: /#[^\r\n]*/,
    group: "PREPROC",
  })

  // ASSIGNMENT OPERATORS
  export const MULASSIGN = createToken({
    name: "MULASSIGN",
    pattern: "*=",
    label: "'*='",
    categories: ASSIGN_OP,
  })
  export const DIVASSIGN = createToken({
    name: "DIVASSIGN",
    pattern: "/=",
    label: "'/='",
    categories: ASSIGN_OP,
  })
  export const MODASSIGN = createToken({
    name: "MODASSIGN",
    pattern: "%=",
    label: "'%='",
    categories: ASSIGN_OP,
  })
  export const ADDASSIGN = createToken({
    name: "ADDASSIGN",
    pattern: "+=",
    label: "'+='",
    categories: ASSIGN_OP,
  })
  export const SUBASSIGN = createToken({
    name: "SUBASSIGN",
    pattern: "-=",
    label: "'-='",
    categories: ASSIGN_OP,
  })
  export const LEFTASSIGN = createToken({
    name: "LEFTASSIGN",
    pattern: "<<=",
    label: "'<<='",
    categories: ASSIGN_OP,
  })
  export const RIGHTASSIGN = createToken({
    name: "RIGHTASSIGN",
    pattern: ">>=",
    label: "'>>='",
    categories: ASSIGN_OP,
  })
  export const ANDASSIGN = createToken({
    name: "ANDASSIGN",
    pattern: "&=",
    label: "'&='",
    categories: ASSIGN_OP,
  })
  export const XORASSIGN = createToken({
    name: "XORASSIGN",
    pattern: "^=",
    label: "'^='",
    categories: ASSIGN_OP,
  })
  export const ORASSIGN = createToken({
    name: "ORASSIGN",
    pattern: "|=",
    label: "'|='",
    categories: ASSIGN_OP,
  })

  // OPERATORS
  export const INC_OP = createToken({
    name: "INC_OP",
    pattern: "++",
    label: "'++'",
    categories: PREFIX_OP,
  })
  export const QUESTION = createToken({
    name: "QUESTION",
    pattern: "?",
    label: "'?'",
  })
  export const COLON = createToken({
    name: "COLON",
    pattern: ":",
    label: "':'",
  })
  export const DEC_OP = createToken({
    name: "DEC_OP",
    pattern: "--",
    label: "'--'",
    categories: PREFIX_OP,
  })
  export const AND_OP = createToken({
    name: "AND_OP",
    pattern: "&&",
    label: "'&&'",
  })
  export const XOR_OP = createToken({
    name: "XOR_OP",
    pattern: "^^",
    label: "'^^'",
  })
  export const OR_OP = createToken({
    name: "OR_OP",
    pattern: "||",
    label: "'||'",
  })
  export const LEFT_OP = createToken({
    name: "LEFT_OP",
    pattern: "<<",
    label: "'<<'",
    categories: SHIFT_OP,
  })
  export const RIGHT_OP = createToken({
    name: "RIGHT_OP",
    pattern: ">>",
    label: "'>>'",
    categories: SHIFT_OP,
  })
  export const EQ_OP = createToken({
    name: "EQ_OP",
    pattern: "==",
    label: "'=='",
    categories: EQUALITY_OP,
  })
  export const NE_OP = createToken({
    name: "NE_OP",
    pattern: "!=",
    label: "'!='",
    categories: EQUALITY_OP,
  })
  export const LE_OP = createToken({
    name: "LE_OP",
    pattern: "<=",
    label: "'<='",
    categories: RELATIONAL_OP,
  })
  export const GE_OP = createToken({
    name: "GE_OP",
    pattern: ">=",
    label: "'>='",
    categories: RELATIONAL_OP,
  })
  export const LEFT_ANGLE = createToken({
    name: "LEFT_ANGLE",
    pattern: "<",
    label: "'<'",
    categories: RELATIONAL_OP,
  })
  export const RIGHT_ANGLE = createToken({
    name: "RIGHT_ANGLE",
    pattern: ">",
    label: "'>'",
    categories: RELATIONAL_OP,
  })
  export const PLUS = createToken({
    name: "PLUS",
    pattern: "+",
    label: "'+'",
    categories: [PREFIX_OP, ADDITIVE_OP],
  })
  export const TILDE = createToken({
    name: "TILDE",
    pattern: "~",
    label: "'~'",
    categories: PREFIX_OP,
  })
  export const BANG = createToken({
    name: "BANG",
    pattern: "!",
    label: "'!'",
    categories: PREFIX_OP,
  })
  export const CARET = createToken({
    name: "CARET",
    pattern: "^",
    label: "'^'",
  })
  export const AMPERSAND = createToken({
    name: "AND",
    pattern: "&",
    label: "'&'",
  })
  export const VERTICALBAR = createToken({
    name: "PIPE",
    pattern: "|",
    label: "'|'",
  })
  export const SLASH = createToken({
    name: "SLASH",
    pattern: "/",
    label: "'/'",
    categories: MULTIPLICATIVE_OP,
  })
  export const PERCENT = createToken({
    name: "PERCENT",
    pattern: "%",
    label: "'%'",
    categories: MULTIPLICATIVE_OP,
  })
  export const STAR = createToken({
    name: "STAR",
    pattern: "*",
    label: "'*'",
    categories: MULTIPLICATIVE_OP,
  })
  export const DASH = createToken({
    name: "DASH",
    pattern: "-",
    label: "'-'",
    categories: [PREFIX_OP, ADDITIVE_OP],
  })
  export const COMMA = createToken({
    name: "COMMA",
    pattern: ",",
    label: "','",
  })
  export const EQUAL = createToken({
    name: "EQUAL",
    pattern: "=",
    label: "'='",
    categories: ASSIGN_OP,
  })

  export const LEFT_PAREN = createToken({
    name: "LEFT_PAREN",
    pattern: "(",
    label: "'('",
  })
  export const RIGHT_PAREN = createToken({
    name: "RIGHT_PAREN",
    pattern: ")",
    label: "')'",
  })
  export const LEFT_BRACKET = createToken({
    name: "LEFT_BRACKET",
    pattern: "[",
    label: "'['",
  })
  export const RIGHT_BRACKET = createToken({
    name: "RIGHT_BRACKET",
    pattern: "]",
    label: "']'",
  })
  export const LEFT_BRACE = createToken({
    name: "LEFT_BRACE",
    pattern: "{",
    label: "'{'",
  })
  export const RIGHT_BRACE = createToken({
    name: "RIGHT_BRACE",
    pattern: "}",
    label: "'}'",
  })
  export const SEMICOLON = createToken({
    name: "SEMICOLON",
    pattern: ";",
    label: "';'",
  })

  export const IDENTIFIER = createToken({
    name: "IDENTIFIER",
    pattern: /\w[\w\d]*/i,
  })

  function KEYWORD(const1: string, ...categories: TokenType[]) {
    return createToken({
      name: const1,
      pattern: RegExp(const1.toLowerCase()),
      label: "'" + const1.toLowerCase() + "'",
      longer_alt: IDENTIFIER,
      categories,
    })
  }

  export const CONST = KEYWORD("CONST")
  export const UNIFORM = KEYWORD("UNIFORM")
  export const LAYOUT = KEYWORD("LAYOUT")
  export const CENTROID = KEYWORD("CENTROID")
  export const FLAT = KEYWORD("FLAT", INTERPOLATION_QUALIFIER)
  export const SMOOTH = KEYWORD("SMOOTH", INTERPOLATION_QUALIFIER)
  export const BREAK = KEYWORD("BREAK")
  export const CONTINUE = KEYWORD("CONTINUE")
  export const DO = KEYWORD("DO")
  export const PRECISION = KEYWORD("PRECISION")
  export const FOR = KEYWORD("FOR")
  export const WHILE = KEYWORD("WHILE")
  export const SWITCH = KEYWORD("SWITCH")
  export const CASE = KEYWORD("CASE")
  export const DEFAULT = KEYWORD("DEFAULT")

  export const IF = KEYWORD("IF")
  export const ELSE = KEYWORD("ELSE")
  export const INVARIANT = KEYWORD("INVARIANT")
  export const INOUT = KEYWORD("INOUT", PARAMETER_QUALIFIER)
  export const OUT = KEYWORD("OUT", PARAMETER_QUALIFIER)
  export const VOID = KEYWORD("VOID")
  export const STRUCT = KEYWORD("STRUCT")
  export const DISCARD = KEYWORD("DISCARD")
  export const RETURN = KEYWORD("RETURN")
  export const LOWP = KEYWORD("LOWP", PRECISION_QUALIFIER)
  export const MEDIUMP = KEYWORD("MEDIUMP", PRECISION_QUALIFIER)
  export const HIGHP = KEYWORD("HIGHP", PRECISION_QUALIFIER)
  export const BASIC_TYPE = createToken({
    name: "BASIC_TYPE",
    pattern: Lexer.NA,
  })
  export const BASIC_TYPES = [
    "bool",
    "int",
    "float",
    "mat2",
    "mat3",
    "mat4",
    "mat2x2",
    "mat2x3",
    "mat2x4",
    "mat3x2",
    "mat3x3",
    "mat3x4",
    "mat4x2",
    "mat4x3",
    "mat4x4",
    "vec2",
    "vec3",
    "vec4",
    "ivec2",
    "ivec3",
    "ivec4",
    "bvec2",
    "bvec3",
    "bvec4",
    "uint",
    "uvec2",
    "uvec3",
    "uvec4",
    "sampler2D",
    "sampler3D",
    "samplerCube",
    "sampler2DShadow",
    "samplerCubeShadow",
    "sampler2DArray",
    "sampler2DArrayShadow",
    "isampler2D",
    "isampler3D",
    "isamplerCube",
    "isampler2DArray",
    "usampler2D   ",
    "usampler3D",
    "usamplerCube",
    "usampler2DArray",
  ].map((t) =>
    createToken({
      name: t.toUpperCase(),
      pattern: t,
      longer_alt: IDENTIFIER,
      categories: [BASIC_TYPE],
    }),
  )
  export const IN = KEYWORD("IN", PARAMETER_QUALIFIER)
  export const BOOLCONSTANT = createToken({
    name: "BOOLCONSTANT",
    pattern: /true|false/,
    longer_alt: IDENTIFIER,
  })
  export const FLOATCONSTANT = createToken({
    name: "FLOATCONSTANT",
    pattern: /((\d+\.\d*|\.\d+)(e[+\-]?\d+)?|\d+e[+\-]?\d+)f?/i,
  })
  export const DOT = createToken({
    name: "DOT",
    pattern: ".",
    label: "'.'",
  })
  export const UINTCONSTANT = createToken({
    name: "UINTCONSTANT",
    pattern: /\d+u/,
  })
  export const INTCONSTANT = createToken({
    name: "INTCONSTANT",
    pattern: /\d+/,
  })
}
// IDENTIFIER needs to go last, but must be declared first
// so it can be referenced in longerAlt
const ALL_TOKENS = pull(Object.values(TOKEN), TOKEN.IDENTIFIER).flatMap((x) =>
  Array.isArray(x) ? x : [x],
)
ALL_TOKENS.push(TOKEN.IDENTIFIER)

const GLSLLexer = new Lexer(ALL_TOKENS, {
  ensureOptimizations: DEV,
})

// interface Node {
//   type: string
// }

export type CstNode = Node
type FFF = {
  [K in keyof GLSLParser]: GLSLParser[K] extends (...any: any) => infer R
    ? R
    : never
}

class GLSLParser extends EmbeddedActionsParser {
  currIdx!: number

  // expressions
  postfixExpression!: (idx: number) => Expression
  multiplicativeExpression!: (idx: number) => Expression
  additiveExpression!: (idx: number) => Expression
  shiftExpression!: (idx: number) => Expression
  relationalExpression!: (idx: number) => Expression
  equalityExpression!: (idx: number) => Expression
  andExpression!: (idx: number) => Expression
  exclusiveOrExpression!: (idx: number) => Expression
  inclusiveOrExpression!: (idx: number) => Expression
  assignmentExpression!: (idx: number) => Expression
  logicalOrExpression!: (idx: number) => Expression
  conditionalExpression!: (idx: number) => Expression
  primaryExpression!: (idx: number) => Expression
  logicalAndExpression!: (idx: number) => Expression
  constantExpression!: (idx: number) => Expression
  unaryExpression!: (idx: number) => Expression
  logicalXorExpression!: (idx: number) => Expression
  expression!: (idx: number) => Expression

  // statements
  statement!: (idx: number) => Statement
  iterationStatement!: (idx: number) => IterationStatement
  selectionStatement!: (idx: number) => SelectionStatement
  switchStatement!: (idx: number) => SwitchStatement
  caseLabel!: (idx: number) => CaseLabel
  compoundStatement!: (idx: number) => CompoundStatement
  jumpStatement!: (idx: number) => JumpStatement

  precisionQualifier!: (idx: number) => IToken
  structSpecifier!: (idx: number) => StructSpecifier
  functionCall!: (idx: number) => FunctionCall
  declaration!: (idx: number) => Declaration
  translationUnit!: (idx?: number) => TranslationUnit
  structDeclarationList!: (idx: number) => StructDeclaration[]
  typeQualifier!: (idx: number) => TypeQualifier
  typeSpecifier!: (idx: number) => TypeSpecifier
  singleDeclaration!: (idx: number) => void
  fullySpecifiedType!: (idx: number) => FullySpecifiedType
  initializer!: (idx: number) => Expression
  storageQualifier!: (idx: number) => StorageQualifier
  layoutQualifier!: (idx: number) => LayoutQualifier
  typeSpecifierNoPrec!: (idx: number) => TypeSpecifier
  typeSpecifierNonArray!: (idx: number) => IToken | StructSpecifier
  externalDeclaration!: (idx: number) => Declaration
  condition!: (idx: number) => Expression | InitDeclaratorListDeclaration
  functionCallHeader!: (...args: any[]) => void
  parameterDeclaration!: (idx: number) => ParameterDeclaration
  expressionStatement!: (idx: number) => ExpressionStatement

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
        this.foo.length = fooStart
        this.foo.push(result as any)
      }
      return result
    }
  }

  reset() {
    this.foo = []
  }

  protected RULEE<T, S extends keyof GLSLParser>(
    name: S,
    implementation: (...implArgs: any[]) => FFF[S],
    config?: IRuleConfig<T>,
  ): (idxInCallingRule?: number, ...args: any[]) => FFF[S] {
    return super.RULE(name, this.ANNOTATE(implementation) as any, config) as any
  }

  constructor() {
    super(ALL_TOKENS, { skipValidations: !DEV })

    const $ = this

    function LEFT_ASSOC(rule: (idx: number) => Expression, tok: TokenType) {
      let result = $.SUBRULE1(rule)
      $.MANY(
        $.ANNOTATE(() => {
          const op = $.CONSUME(tok)
          const rhs = $.SUBRULE2(rule)
          result = { type: "binaryExpression", lhs: result, rhs, op }
        }),
      )
      return result
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
    $.RULEE("primaryExpression", () =>
      $.OR([
        {
          ALT: () => {
            $.CONSUME(TOKEN.LEFT_PAREN)
            const result = $.SUBRULE($.expression)
            $.CONSUME(TOKEN.RIGHT_PAREN)
            return result
          },
        },
        { ALT: () => $.CONSUME(TOKEN.IDENTIFIER) },
        { ALT: () => $.CONSUME(TOKEN.INTCONSTANT) },
        { ALT: () => $.CONSUME(TOKEN.UINTCONSTANT) },
        { ALT: () => $.CONSUME(TOKEN.FLOATCONSTANT) },
        { ALT: () => $.CONSUME(TOKEN.BOOLCONSTANT) },
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
    $.RULEE(
      "postfixExpression",
      (): Expression =>
        $.OR1([
          {
            GATE: $.BACKTRACK($.functionCallHeader),
            ALT: () => $.SUBRULE1($.functionCall),
          },
          {
            ALT: () => {
              let result = $.SUBRULE($.primaryExpression)
              $.MANY(() =>
                $.OR2([
                  {
                    ALT: () => {
                      $.CONSUME(TOKEN.LEFT_BRACKET)
                      const index = $.SUBRULE($.expression)
                      $.CONSUME(TOKEN.RIGHT_BRACKET)
                      result = { type: "arrayAccess", on: result, index }
                    },
                  },
                  {
                    ALT: () => {
                      $.CONSUME1(TOKEN.DOT)
                      const functionCall = $.SUBRULE2($.functionCall)
                      result = { type: "methodCall", on: result, functionCall }
                    },
                  },
                  {
                    ALT: () => {
                      $.CONSUME2(TOKEN.DOT)
                      const field = $.CONSUME(TOKEN.IDENTIFIER)
                      result = { type: "fieldAccess", on: result, field }
                    },
                  },
                  {
                    ALT: () => {
                      result = {
                        type: "postfixExpression",
                        on: result,
                        op: $.CONSUME(TOKEN.INC_OP),
                      }
                    },
                  },
                  {
                    ALT: () => {
                      result = {
                        type: "postfixExpression",
                        on: result,
                        op: $.CONSUME(TOKEN.DEC_OP),
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
    $.RULEE("functionCall", () => {
      const what = $.SUBRULE($.typeSpecifierNoPrec)
      $.CONSUME(TOKEN.LEFT_PAREN)
      const args: Expression[] = []
      $.MANY_SEP({
        DEF: () => args.push($.SUBRULE($.assignmentExpression)),
        SEP: TOKEN.COMMA,
      })
      $.CONSUME(TOKEN.RIGHT_PAREN)
      return { type: "functionCall", what, args }
    })
    // used for lookahead
    $.RULEE("functionCallHeader", () => {
      $.SUBRULE($.typeSpecifierNoPrec)
      $.CONSUME(TOKEN.LEFT_PAREN)
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
    $.RULEE("unaryExpression", () =>
      $.OR([
        { ALT: () => $.SUBRULE1($.postfixExpression) },
        {
          ALT: () => {
            const op = $.CONSUME(TOKEN.PREFIX_OP)
            const of = $.SUBRULE2(this.unaryExpression)
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
    $.RULEE("multiplicativeExpression", () =>
      LEFT_ASSOC($.unaryExpression, TOKEN.MULTIPLICATIVE_OP),
    )
    //SPEC// additiveExpression:
    //SPEC//     multiplicativeExpression
    //SPEC//     additiveExpression PLUS multiplicativeExpression
    //SPEC//     additiveExpression DASH multiplicativeExpression
    $.RULEE("additiveExpression", () =>
      LEFT_ASSOC($.multiplicativeExpression, TOKEN.ADDITIVE_OP),
    )
    //SPEC// shiftExpression:
    //SPEC//     additiveExpression
    //SPEC//     shiftExpression LEFT_OP additiveExpression
    //SPEC//     shiftExpression RIGHT_OP additiveExpression
    $.RULEE("shiftExpression", () =>
      LEFT_ASSOC($.additiveExpression, TOKEN.SHIFT_OP),
    )
    //SPEC// relationalExpression:
    //SPEC//     shiftExpression
    //SPEC//     relationalExpression LEFT_ANGLE shiftExpression
    //SPEC//     relationalExpression RIGHT_ANGLE shiftExpression
    //SPEC//     relationalExpression LE_OP shiftExpression
    //SPEC//     relationalExpression GE_OP shiftExpression
    $.RULEE("relationalExpression", () =>
      LEFT_ASSOC(this.shiftExpression, TOKEN.RELATIONAL_OP),
    )
    //SPEC// equalityExpression:
    //SPEC//     relationalExpression
    //SPEC//     equalityExpression EQ_OP relationalExpression
    //SPEC//     equalityExpression NE_OP relationalExpression
    $.RULEE("equalityExpression", () =>
      LEFT_ASSOC($.relationalExpression, TOKEN.EQUALITY_OP),
    )
    //SPEC// andExpression:
    //SPEC//     equalityExpression
    //SPEC//     andExpression AMPERSAND equalityExpression
    $.RULEE("andExpression", () =>
      LEFT_ASSOC($.equalityExpression, TOKEN.AMPERSAND),
    )
    //SPEC// exclusiveOrExpression:
    //SPEC//     andExpression
    //SPEC//     exclusiveOrExpression CARET andExpression
    $.RULEE("exclusiveOrExpression", () =>
      LEFT_ASSOC($.andExpression, TOKEN.CARET),
    )
    //SPEC// inclusiveOrExpression:
    //SPEC//     exclusiveOrExpression
    //SPEC//     inclusiveOrExpression VERTICALBAR exclusiveOrExpression
    $.RULEE("inclusiveOrExpression", () =>
      LEFT_ASSOC($.exclusiveOrExpression, TOKEN.VERTICALBAR),
    )
    //SPEC// logicalAndExpression:
    //SPEC//     inclusiveOrExpression
    //SPEC//     logicalAndExpression AND_OP inclusiveOrExpression
    $.RULEE("logicalAndExpression", () =>
      LEFT_ASSOC($.inclusiveOrExpression, TOKEN.AND_OP),
    )
    //SPEC// logicalXorExpression:
    //SPEC//     logicalAndExpression
    //SPEC//     logicalXorExpression XOR_OP logicalAndExpression
    $.RULEE("logicalXorExpression", () =>
      LEFT_ASSOC($.logicalAndExpression, TOKEN.XOR_OP),
    )
    //SPEC// logicalOrExpression:
    //SPEC//     logicalXorExpression
    //SPEC//     logicalOrExpression OR_OP logicalXorExpression
    $.RULEE("logicalOrExpression", () =>
      LEFT_ASSOC($.logicalXorExpression, TOKEN.OR_OP),
    )
    //SPEC// conditionalExpression:
    //SPEC//     logicalOrExpression
    //SPEC//     logicalOrExpression QUESTION expression COLON assignmentExpression
    $.RULEE("conditionalExpression", () => {
      const lhs = $.SUBRULE1($.logicalOrExpression)

      return (
        $.OPTION(() => ({
          type: "conditionalExpression",
          condition: lhs,
          QUESTION: $.CONSUME(TOKEN.QUESTION),
          yes: $.SUBRULE2($.expression),
          COLON: $.CONSUME(TOKEN.COLON),
          no: $.SUBRULE3($.assignmentExpression),
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
    $.RULEE("assignmentExpression", () => {
      let result = $.SUBRULE($.conditionalExpression)
      $.MANY(
        $.ANNOTATE(() => {
          const op = $.CONSUME(TOKEN.ASSIGN_OP)
          const rhs = $.SUBRULE1($.conditionalExpression)
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
    $.RULEE("expression", () => {
      let result!: Expression
      $.AT_LEAST_ONE_SEP({
        SEP: TOKEN.COMMA,
        DEF: () => {
          const rhs = $.SUBRULE($.assignmentExpression)
          return (result = !result
            ? rhs
            : { type: "commaExpression", lhs: result, rhs })
        },
      })
      return result
    })
    //SPEC// constantExpression:
    //SPEC//     conditionalExpression
    $.RULEE("constantExpression", () => $.SUBRULE($.conditionalExpression))
    //SPEC// declaration:
    //SPEC//     functionPrototype SEMICOLON
    //SPEC//     initDeclaratorList SEMICOLON
    //SPEC//     PRECISION precisionQualifier typeSpecifierNoPrec SEMICOLON
    //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE SEMICOLON
    //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER SEMICOLON
    //SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER LEFT_BRACKET
    //SPEC//                                                      constantExpression RIGHT_BRACKET SEMICOLON
    //SPEC//     typeQualifier SEMICOLON
    $.RULEE(
      "externalDeclaration",
      (noFunction?: boolean): Declaration =>
        $.OR([
          // initDeclaratorList, functionPrototype or functionDefinition
          {
            ALT: () => {
              const type = $.SUBRULE($.fullySpecifiedType)
              return $.OR2([
                // functionPrototype
                {
                  // GATE: () => !noFunction,
                  ALT: () => {
                    const name = $.CONSUME1(TOKEN.IDENTIFIER)
                    $.CONSUME(TOKEN.LEFT_PAREN)
                    const params: ParameterDeclaration[] = []
                    $.MANY_SEP({
                      SEP: TOKEN.COMMA,
                      DEF: () => params.push($.SUBRULE($.parameterDeclaration)),
                    })
                    $.CONSUME(TOKEN.RIGHT_PAREN)
                    return $.OR3([
                      {
                        ALT: (): FunctionPrototype => {
                          $.CONSUME(TOKEN.SEMICOLON)
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
                          const body = $.SUBRULE($.compoundStatement)
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
                    $.MANY_SEP2({
                      SEP: TOKEN.COMMA,
                      DEF: () => {
                        const name = $.CONSUME3(TOKEN.IDENTIFIER)
                        const arrayInit = $.OPTION5(() => {
                          $.CONSUME(TOKEN.LEFT_BRACKET)
                          const expr = $.OPTION6(() =>
                            $.SUBRULE($.constantExpression),
                          )
                          $.CONSUME(TOKEN.RIGHT_BRACKET)
                          return { type: "arrayInit", expr }
                        })
                        const init = $.OPTION7(() => {
                          $.CONSUME(TOKEN.EQUAL)
                          return $.SUBRULE($.initializer)
                        })
                        declarators.push({
                          type: "declarator",
                          name,
                          arrayInit,
                          init,
                        })
                      },
                    })
                    $.CONSUME2(TOKEN.SEMICOLON)
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
              $.CONSUME(TOKEN.PRECISION)
              const precisionQualifier = $.CONSUME(TOKEN.PRECISION_QUALIFIER)
              const typeSpecifierNoPrec = $.SUBRULE($.typeSpecifierNoPrec)
              return {
                type: "precisionDeclaration",
                precisionQualifier,
                typeSpecifierNoPrec,
              }
            },
          },
        ]),
    )
    $.RULEE("declaration", () =>
      $.SUBRULE($.externalDeclaration, { ARGS: [true] }),
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
    $.RULEE("parameterDeclaration", (): ParameterDeclaration => {
      //     constQualifier
      const parameterTypeQualifier = $.OPTION(() => $.CONSUME(TOKEN.CONST))
      //     parameterQualifier
      const parameterQualifier = $.OPTION1(() =>
        $.OR4([
          { ALT: () => $.CONSUME(TOKEN.IN) },
          { ALT: () => $.CONSUME(TOKEN.OUT) },
          { ALT: () => $.CONSUME(TOKEN.INOUT) },
        ]),
      )

      const typeSpecifier = $.SUBRULE($.typeSpecifier)
      let pName, arrayInit
      $.OPTION2(() => {
        pName = $.CONSUME2(TOKEN.IDENTIFIER)
        //arraySpecifier
        $.OPTION3(() => {
          $.CONSUME4(TOKEN.LEFT_BRACKET)
          arrayInit = $.CONSUME(TOKEN.INTCONSTANT)
          $.CONSUME4(TOKEN.RIGHT_BRACKET)
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
    //SPEC//     // GramNote:  No 'enum', or 'typedef'.
    $.RULEE("singleDeclaration", () =>
      $.OR([
        {
          ALT: () => {
            $.SUBRULE($.fullySpecifiedType)
            $.OPTION1(() => {
              $.CONSUME1(TOKEN.IDENTIFIER)
              $.OPTION2(() => {
                $.CONSUME(TOKEN.LEFT_BRACKET)
                $.OPTION3(() => $.SUBRULE($.constantExpression))
                $.CONSUME(TOKEN.RIGHT_BRACKET)
              })
              $.OPTION4(() => {
                $.CONSUME(TOKEN.EQUAL)
                $.SUBRULE($.initializer)
              })
            })
          },
        },
        {
          ALT: () => ({
            // TODO this need to be followed by MANY
            type: "invariantDeclaration",
            INVARIANT: $.CONSUME(TOKEN.INVARIANT),
            IDENTIFIER: $.CONSUME2(TOKEN.IDENTIFIER),
          }),
        },
      ]),
    )
    //SPEC// fullySpecifiedType:
    //SPEC//     typeSpecifier
    //SPEC//     typeQualifier typeSpecifier
    $.RULEE("fullySpecifiedType", () => {
      const typeQualifier = $.OPTION(() => $.SUBRULE($.typeQualifier))
      const typeSpecifier = $.SUBRULE($.typeSpecifier)
      return { type: "fullySpecifiedType", typeQualifier, typeSpecifier }
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
    //SPEC//     IDENTIFIER EQUAL UINTCONSTANT
    $.RULEE("layoutQualifier", () => {
      $.CONSUME(TOKEN.LAYOUT)
      $.CONSUME(TOKEN.LEFT_PAREN)
      const layoutQualifierIds: {
        IDENTIFIER: Token
        init: Token | undefined
      }[] = []
      $.AT_LEAST_ONE_SEP({
        SEP: TOKEN.COMMA,
        DEF: () => {
          const IDENTIFIER = $.CONSUME(TOKEN.IDENTIFIER)
          let init
          $.OPTION(() => {
            $.CONSUME(TOKEN.EQUAL)
            init = $.OR9([
              { ALT: () => $.CONSUME(TOKEN.INTCONSTANT) },
              { ALT: () => $.CONSUME(TOKEN.UINTCONSTANT) },
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
    $.RULEE("typeQualifier", () => {
      let storageQualifier,
        layoutQualifier,
        interpolationQualifier,
        invariantQualifier
      $.OR([
        {
          ALT: () => {
            storageQualifier = $.SUBRULE1($.storageQualifier)
          },
        },
        {
          ALT: () => {
            layoutQualifier = $.SUBRULE2($.layoutQualifier)
            storageQualifier = $.OPTION1(() => $.SUBRULE3($.storageQualifier))
          },
        },
        {
          ALT: () => {
            interpolationQualifier = $.CONSUME(TOKEN.INTERPOLATION_QUALIFIER)
            storageQualifier = $.OPTION2(() => $.SUBRULE5($.storageQualifier))
          },
        },
        {
          ALT: () => {
            // $.SUBRULE($.invariantQualifier)
            invariantQualifier = $.CONSUME(TOKEN.INVARIANT)
            interpolationQualifier = $.OPTION3(() =>
              $.CONSUME1(TOKEN.INTERPOLATION_QUALIFIER),
            )
            storageQualifier = $.SUBRULE7($.storageQualifier)
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
    $.RULEE("storageQualifier", () => {
      let CONST, CENTROID, IN, OUT, UNIFORM
      $.OR([
        { ALT: () => $.CONSUME(TOKEN.CONST) },
        {
          ALT: () => {
            $.OPTION(() => $.CONSUME(TOKEN.CENTROID))
            $.OR9([
              { ALT: () => $.CONSUME(TOKEN.IN) },
              { ALT: () => $.CONSUME(TOKEN.OUT) },
            ])
          },
        },
        { ALT: () => $.CONSUME(TOKEN.UNIFORM) },
      ])
      return { type: "storageQualifier", CONST, CENTROID, IN, OUT, UNIFORM }
    })
    //SPEC// typeSpecifier:
    //SPEC//     typeSpecifierNoPrec
    //SPEC//     precisionQualifier typeSpecifierNoPrec
    $.RULEE("typeSpecifier", (): TypeSpecifier => {
      const precisionQualifier = $.OPTION(() => $.SUBRULE($.precisionQualifier))
      const typeSpecifierNoPrec = $.SUBRULE($.typeSpecifierNoPrec)
      return Object.assign({}, typeSpecifierNoPrec, { precisionQualifier })
    })
    //SPEC// typeSpecifierNoPrec:
    //SPEC//     typeSpecifierNonarray
    //SPEC//     typeSpecifierNonarray LEFT_BRACKET RIGHT_BRACKET
    //SPEC//     typeSpecifierNonarray LEFT_BRACKET constantExpression RIGHT_BRACKET
    $.RULEE("typeSpecifierNoPrec", () => {
      const typeSpecifierNonArray = $.SUBRULE($.typeSpecifierNonArray)
      const arraySpecifier = $.OPTION1(() => {
        $.CONSUME(TOKEN.LEFT_BRACKET)
        const size = $.OPTION2(() => $.SUBRULE($.constantExpression))
        $.CONSUME(TOKEN.RIGHT_BRACKET)
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
    $.RULEE("typeSpecifierNonArray", () =>
      $.OR([
        { ALT: () => $.CONSUME(TOKEN.BASIC_TYPE) },
        { ALT: () => $.CONSUME(TOKEN.VOID) },
        { ALT: () => $.SUBRULE($.structSpecifier) },
        { ALT: () => $.CONSUME(TOKEN.IDENTIFIER) },
      ]),
    )
    //SPEC// precisionQualifier:
    //SPEC//         HIGH_PRECISION
    //SPEC//         MEDIUM_PRECISION
    //SPEC//         LOW_PRECISION
    $.RULEE("precisionQualifier", () => $.CONSUME(TOKEN.PRECISION_QUALIFIER))

    //SPEC// structSpecifier:
    //SPEC//         STRUCT IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE
    //SPEC//         STRUCT LEFT_BRACE structDeclarationList RIGHT_BRACE

    $.RULEE("structSpecifier", (): StructSpecifier => {
      $.CONSUME(TOKEN.STRUCT)
      const name = $.OPTION2(() => $.CONSUME(TOKEN.IDENTIFIER))
      $.CONSUME(TOKEN.LEFT_BRACE)
      const declarations = $.SUBRULE($.structDeclarationList)
      $.CONSUME(TOKEN.RIGHT_BRACE)
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
    $.RULEE("structDeclarationList", () => {
      const result: StructDeclaration[] = []
      $.MANY(() => {
        const fsType = $.SUBRULE($.fullySpecifiedType)
        const declarators: { name: Token }[] = []
        $.MANY_SEP({
          SEP: TOKEN.COMMA,
          DEF: () => ({
            name: $.CONSUME(TOKEN.IDENTIFIER),
            arrayInit: $.OPTION2(() => {
              $.CONSUME(TOKEN.LEFT_BRACKET)
              $.OPTION3(() => $.SUBRULE($.constantExpression))
              $.CONSUME(TOKEN.RIGHT_BRACKET)
            }),
          }),
        })
        $.CONSUME(TOKEN.SEMICOLON)
        result.push({
          type: "structDeclaration",
          fsType,
          declarators,
        })
      })
      return result
    })

    //SPEC// initializer:
    //SPEC//         assignmentExpression
    $.RULEE("initializer", () => $.SUBRULE($.assignmentExpression))
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
    $.RULEE("statement", () =>
      $.OR<Statement>([
        // declarationStatement
        {
          GATE: $.BACKTRACK($.singleDeclaration),
          ALT: () =>
            $.SUBRULE($.declaration, {
              ARGS: [true],
            }) as InitDeclaratorListDeclaration,
        },
        { ALT: () => $.SUBRULE($.expressionStatement) },
        { ALT: () => $.SUBRULE($.selectionStatement) },
        { ALT: () => $.SUBRULE($.switchStatement) },
        { ALT: () => $.SUBRULE($.caseLabel) },
        { ALT: () => $.SUBRULE($.iterationStatement) },
        { ALT: () => $.SUBRULE($.jumpStatement) },
        { ALT: () => $.SUBRULE($.compoundStatement) },
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
    $.RULEE("compoundStatement", () => {
      $.CONSUME(TOKEN.LEFT_BRACE)
      const statements: Statement[] = []
      $.MANY(() => statements.push($.SUBRULE($.statement)))
      $.CONSUME(TOKEN.RIGHT_BRACE)
      return { type: "compoundStatement", statements }
    })
    //SPEC// expressionStatement:
    //SPEC//         SEMICOLON
    //SPEC//         expression SEMICOLON
    $.RULEE("expressionStatement", () => {
      return {
        type: "expressionStatement",
        expression: $.OPTION(() => $.SUBRULE($.expression)),
        SEMICOLON: $.CONSUME(TOKEN.SEMICOLON),
      }
    })
    //SPEC// selectionStatement:
    //SPEC//         IF LEFT_PAREN expression RIGHT_PAREN selectionRestStatement
    //SPEC// selectionRestStatement:
    //SPEC//         statementWithScope ELSE statementWithScope
    //SPEC//         statementWithScope
    $.RULEE("selectionStatement", () => {
      const IF = $.CONSUME(TOKEN.IF)
      const LEFT_PAREN = $.CONSUME(TOKEN.LEFT_PAREN)
      const condition = $.SUBRULE($.expression)
      const RIGHT_PAREN = $.CONSUME(TOKEN.RIGHT_PAREN)
      const yes = $.SUBRULE2($.statement)
      let ELSE, no
      $.OPTION(() => {
        ELSE = $.CONSUME(TOKEN.ELSE)
        $.SUBRULE3($.statement)
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
    })

    //SPEC// condition:
    //SPEC//         expression
    //SPEC//         fullySpecifiedType IDENTIFIER EQUAL initializer
    // simplify to expression | declaration and check in checker
    $.RULEE("condition", () =>
      $.OR({
        MAX_LOOKAHEAD: 4,
        DEF: [
          {
            GATE: $.BACKTRACK($.singleDeclaration),
            // TODO
            // ALT: () => {
            //   $.SUBRULE2($.fullySpecifiedType)
            //   $.CONSUME(TOKEN.IDENTIFIER)
            //   $.CONSUME(TOKEN.EQUAL)
            //   $.SUBRULE3($.initializer)
            // },
            ALT: (): InitDeclaratorListDeclaration => {
              const fsType = $.SUBRULE2($.fullySpecifiedType)
              const name = $.CONSUME(TOKEN.IDENTIFIER)
              $.CONSUME(TOKEN.EQUAL)
              const init = $.SUBRULE3($.initializer)
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
            ALT: () => $.SUBRULE($.expression),
          },
        ],
      }),
    )
    //SPEC// switchStatement:
    //SPEC//         SWITCH LEFT_PAREN expression RIGHT_PAREN LEFT_BRACE switchStatementList RIGHT_BRACE
    //SPEC// switchStatementList:
    //SPEC//         /* nothing */
    //SPEC//         statementList
    $.RULEE("switchStatement", () => ({
      type: "switchStatement",
      SWITCH: $.CONSUME(TOKEN.SWITCH),
      LEFT_PAREN: $.CONSUME(TOKEN.LEFT_PAREN),
      initExpression: $.SUBRULE($.expression),
      RIGHT_PAREN: $.CONSUME(TOKEN.RIGHT_PAREN),
      body: $.SUBRULE($.compoundStatement),
    }))
    //SPEC// caseLabel:
    //SPEC//         CASE expression COLON
    //SPEC//         DEFAULT COLON
    $.RULEE(
      "caseLabel",
      (): CaseLabel =>
        $.OR([
          {
            ALT: () => {
              $.CONSUME(TOKEN.CASE)
              const _case = $.SUBRULE($.expression)
              $.CONSUME(TOKEN.COLON)
              return { type: "caseLabel", _case }
            },
          },
          {
            ALT: () => {
              $.CONSUME2(TOKEN.DEFAULT)
              $.CONSUME2(TOKEN.COLON)
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
    $.RULEE("iterationStatement", () =>
      $.OR([
        {
          ALT: () => ({
            type: "whileStatement",
            WHILE: $.CONSUME(TOKEN.WHILE),
            LEFT_PAREN: $.CONSUME(TOKEN.LEFT_PAREN),
            condition: $.SUBRULE($.condition),
            RIGHT_PAREN: $.CONSUME(TOKEN.RIGHT_PAREN),
            statement: $.SUBRULE($.statement),
          }),
        },
        {
          ALT: () => ({
            type: "doWhileStatement",
            DO: $.CONSUME2(TOKEN.DO),
            statement: $.SUBRULE2($.statement),
            WHILE: $.CONSUME2(TOKEN.WHILE),
            LEFT_PAREN: $.CONSUME2(TOKEN.LEFT_PAREN),
            expression: $.SUBRULE2($.expression),
            RIGHT_PAREN: $.CONSUME2(TOKEN.RIGHT_PAREN),
            SEMICOLON: $.CONSUME2(TOKEN.SEMICOLON),
          }),
        },
        {
          ALT: (): ForStatement => {
            const FOR = $.CONSUME3(TOKEN.FOR)
            const LEFT_PAREN = $.CONSUME3(TOKEN.LEFT_PAREN)
            let initExpression, SEMICOLON1
            $.OR3([
              {
                GATE: $.BACKTRACK($.singleDeclaration),
                ALT: () => {
                  initExpression = $.SUBRULE($.declaration)
                },
              },
              { ALT: () => $.CONSUME1(TOKEN.SEMICOLON) },
              {
                ALT: () => {
                  initExpression = $.SUBRULE3($.expression)
                  SEMICOLON1 = $.CONSUME3(TOKEN.SEMICOLON)
                },
              },
            ])
            const conditionExpression = $.OPTION3(() => $.SUBRULE3($.condition))
            const SEMICOLON2 = $.CONSUME4(TOKEN.SEMICOLON)
            const loopExpression = $.OPTION4(() => $.SUBRULE4($.expression))
            const RIGHT_PAREN = $.CONSUME3(TOKEN.RIGHT_PAREN)
            const statement = $.SUBRULE3($.statement)
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
    $.RULEE("jumpStatement", () => {
      const result: JumpStatement = $.OR([
        {
          ALT: () => {
            $.CONSUME(TOKEN.CONTINUE)
            return { type: "continueStatement" }
          },
        },
        {
          ALT: () => {
            $.CONSUME(TOKEN.BREAK)
            return { type: "breakStatement" }
          },
        },
        {
          ALT: () => {
            $.CONSUME(TOKEN.DISCARD)
            return { type: "discardStatement" }
          },
        },
        {
          ALT: () => {
            $.CONSUME(TOKEN.RETURN)
            const what = $.OPTION(() => $.SUBRULE($.expression))
            return { type: "returnStatement", what }
          },
        },
      ])
      $.CONSUME(TOKEN.SEMICOLON)
      return result
    })
    //SPEC// translationUnit:
    //SPEC//         externalDeclaration
    //SPEC//         translationUnit externalDeclaration
    //SPEC// externalDeclaration:
    //SPEC//         functionDefinition
    //SPEC//         declaration
    $.RULEE("translationUnit", () => {
      const declarations: Declaration[] = []
      $.AT_LEAST_ONE(() => declarations.push($.SUBRULE($.externalDeclaration)))
      return { type: "translationUnit", declarations }
    })

    //SPEC// functionDefinition:
    //SPEC//         functionPrototype compoundStatementNoNewScope

    this.performSelfAnalysis()
  }
}

// ONLY ONCE
export const glslParser = new GLSLParser()

// create the HTML Text
const htmlText = createSyntaxDiagramsCode(
  glslParser.getSerializedGastProductions(),
)
// Write the HTML file to disk
fs.writeFileSync(path.join(__dirname, "../generated_diagrams.html"), htmlText)

const shader = fs.readFileSync(require.resolve("../fixtures/shader.glsl"), {
  encoding: "utf8",
})
const raymarchingPrimitives = fs.readFileSync(
  "./fixtures/raymarchingPrimitives.glsl",
  {
    encoding: "utf8",
  },
)

function underline(
  str: string,
  start: number,
  end: number,
  ff = (x: string) => x.yellow.underline,
  ff2 = (x: string) => x,
): string {
  return (
    ff2(str.substr(0, start)) +
    ff(str.substr(start, end - start)) +
    ff2(str.substr(end))
  )
}

function substrContext(
  input: string,
  token: Pick<IToken, "startLine" | "endLine" | "startColumn" | "endColumn">,
) {
  const lines = input.split("\n")
  const sLine = token.startLine!
  const eLine = token.endLine!
  return (
    "./src/compiler.lambda:" +
    sLine +
    ":" +
    (token.startColumn! - 1) +
    "\n" +
    lines
      .map((l, i) => [i + 1, l] as [number, string])
      .slice(sLine - 2, eLine + 2)
      .map(([n, l]) => {
        if (n >= sLine && n <= eLine) {
          l = underline(
            l,
            sLine === n ? token.startColumn! - 1 : 0,
            eLine === n ? token.endColumn! : l.length,
            (s) => s.red.underline,
          )
        }

        return ("" + n).padStart(5).green + " " + l
      })
      .join("\n")
  )
  // start -= 20
  // if (start < 0) {
  //   start = 0
  // } else {
  //   start = input.lastIndexOf("\n", start) + 1
  // }
  // end += 20
  // if (end > input.length) {
  //   end = input.length
  // } else {
  //   end = input.indexOf("\n", end)
  // }
  // return input.substr(start, end)
}

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

export function parseInput(text: string) {
  const lexingResult = GLSLLexer.tokenize(text)
  checkLexingErrors(text, lexingResult)

  let message = lexingResult.tokens.map(
    (t) => `${t.tokenType.name}(${t.image})`,
  )
  // console.log(message)

  // "input" is a setter which will reset the glslParser's state.
  glslParser.input = lexingResult.tokens
  const result = glslParser.translationUnit()
  result.comments = lexingResult.groups.COMMENTS

  checkParsingErrors(text, glslParser.errors)
  return result
}

console.time("parsing")
const cst = parseInput(shader)
console.timeEnd("parsing")
fs.writeFileSync(
  "./cst.json",
  JSON.stringify(
    cst,
    (key, value) =>
      key == "children"
        ? value.map((v: any) =>
            v.tokenType
              ? "" + v.tokenType.name + " " + v.startOffset
              : "" + v.type + " " + v.firstToken,
          )
        : value?.image
        ? `TOKEN: ${value.tokenType.name}(${value.image})`
        : value || null,
    "  ",
  ),
  {
    encoding: "utf8",
  },
)
console.log("PARSER SUCCESS!!!".green)

const formatted = prettier.format(shader, {
  parser: "glsl-parse",
  plugins: [prettierPlugin],
})
fs.writeFileSync("./shader-formatted.glsl", formatted, { encoding: "utf8" })
