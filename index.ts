import {
  createSyntaxDiagramsCode,
  createToken,
  CstNode,
  CstParser,
  ILexingResult,
  IRecognitionException,
  IToken,
  Lexer,
  TokenType,
} from "chevrotain"
import "colors"
import { pull } from "lodash"
import * as fs from "fs"
import { writeFileSync } from "fs"
import path from "path"

const DEV = process.env.NODE_ENV !== "production"

namespace TOKEN {
  export const WHITESPACE = createToken({
    name: "WHITESPACE",
    pattern: /\s+/,
    group: Lexer.SKIPPED,
  })
  export const LINE_COMMENT = createToken({
    name: "LINE_COMMENT",
    pattern: /\/\/[^\r\n]*/,
    group: Lexer.SKIPPED,
  })
  export const MULTILINE_COMMENT = createToken({
    name: "MULTILINE_COMMENT",
    pattern: /\/\*[\s\S]*?\*\//,
    group: Lexer.SKIPPED,
  })
  export const PREPROC = createToken({
    name: "PREPROC",
    pattern: /#[^\r\n]*/,
    group: Lexer.SKIPPED,
  })

  // OPERATORS
  export const MULASSIGN = createToken({
    name: "MULASSIGN",
    pattern: /\*=/,
    label: "'*='",
  })
  export const DIVASSIGN = createToken({
    name: "DIVASSIGN",
    pattern: /\/=/,
    label: "'/='",
  })
  export const MODASSIGN = createToken({
    name: "MODASSIGN",
    pattern: /%=/,
    label: "'%='",
  })
  export const ADDASSIGN = createToken({
    name: "ADDASSIGN",
    pattern: /\+=/,
    label: "'+='",
  })
  export const SUBASSIGN = createToken({
    name: "SUBASSIGN",
    pattern: /-=/,
    label: "'-='",
  })
  export const LEFTASSIGN = createToken({
    name: "LEFTASSIGN",
    pattern: /<<=/,
    label: "'<<='",
  })
  export const RIGHTASSIGN = createToken({
    name: "RIGHTASSIGN",
    pattern: />>=/,
    label: "'>>='",
  })
  export const ANDASSIGN = createToken({
    name: "ANDASSIGN",
    pattern: /&=/,
    label: "'&='",
  })
  export const XORASSIGN = createToken({
    name: "XORASSIGN",
    pattern: /\^=/,
    label: "'^='",
  })
  export const ORASSIGN = createToken({
    name: "ORASSIGN",
    pattern: /\|=/,
    label: "'|='",
  })

  export const INC_OP = createToken({
    name: "INC_OP",
    pattern: /\+\+/,
    label: "'++'",
  })
  export const QUESTION = createToken({
    name: "QUESTION",
    pattern: /\?/,
    label: "'?'",
  })
  export const COLON = createToken({
    name: "COLON",
    pattern: /:/,
    label: "':'",
  })
  export const DEC_OP = createToken({
    name: "DEC_OP",
    pattern: /--/,
    label: "'--'",
  })
  export const AND_OP = createToken({
    name: "AND_OP",
    pattern: /&&/,
    label: "'&&'",
  })
  export const OR_OP = createToken({
    name: "OR_OP",
    pattern: /\|\|/,
    label: "'||'",
  })
  export const LEFTOP = createToken({
    name: "LEFTOP",
    pattern: /<</,
    label: "'<<'",
  })
  export const RIGHTOP = createToken({
    name: "RIGHTOP",
    pattern: />>/,
    label: "'>>'",
  })
  export const EQOP = createToken({
    name: "EQOP",
    pattern: /==/,
    label: "'=='",
  })
  export const NEOP = createToken({
    name: "NEOP",
    pattern: /!=/,
    label: "'!='",
  })
  export const LEOP = createToken({
    name: "LEOP",
    pattern: /<=/,
    label: "'<='",
  })
  export const GEOP = createToken({
    name: "GEOP",
    pattern: />=/,
    label: "'>='",
  })
  export const LEFTANGLE = createToken({
    name: "LEFTANGLE",
    pattern: /</,
    label: "'<'",
  })
  export const RIGHTANGLE = createToken({
    name: "RIGHTANGLE",
    pattern: />/,
    label: "'>'",
  })
  export const PLUS = createToken({
    name: "PLUS",
    pattern: /\+/,
    label: "'+'",
  })
  export const TILDE = createToken({
    name: "TILDE",
    pattern: /~/,
    label: "'~'",
  })
  export const BANG = createToken({
    name: "BANG",
    pattern: /!/,
    label: "'!'",
  })
  export const CARET = createToken({
    name: "CARET",
    pattern: /\^/,
    label: "'^'",
  })
  export const AMPERSAND = createToken({
    name: "AND",
    pattern: /&/,
    label: "'&'",
  })
  export const VERTICALBAR = createToken({
    name: "PIPE",
    pattern: /\|/,
    label: "'|'",
  })
  export const SLASH = createToken({
    name: "SLASH",
    pattern: /\//,
    label: "'/'",
  })
  export const PERCENT = createToken({
    name: "PERCENT",
    pattern: /%/,
    label: "'%'",
  })
  export const STAR = createToken({
    name: "STAR",
    pattern: /\*/,
    label: "'*'",
  })
  export const DASH = createToken({
    name: "DASH",
    pattern: /-/,
    label: "'-'",
  })
  export const COMMA = createToken({
    name: "COMMA",
    pattern: /,/,
    label: "','",
  })
  export const EQUAL = createToken({
    name: "EQUAL",
    pattern: /=/,
    label: "'='",
  })

  export const LEFT_PAREN = createToken({
    name: "LEFT_PAREN",
    pattern: /\(/,
    label: "'('",
  })
  export const RIGHT_PAREN = createToken({
    name: "RIGHT_PAREN",
    pattern: /\)/,
    label: "')'",
  })
  export const LEFT_BRACKET = createToken({
    name: "LEFT_BRACKET",
    pattern: /\[/,
    label: "'['",
  })
  export const RIGHT_BRACKET = createToken({
    name: "RIGHT_BRACKET",
    pattern: /]/,
    label: "']'",
  })
  export const LEFT_BRACE = createToken({
    name: "LEFT_BRACE",
    pattern: /{/,
    label: "'{'",
  })
  export const RIGHT_BRACE = createToken({
    name: "RIGHT_BRACE",
    pattern: /}/,
    label: "'}'",
  })
  export const SEMICOLON = createToken({
    name: "SEMICOLON",
    pattern: /;/,
    label: "';'",
  })

  export const IDENTIFIER = createToken({
    name: "IDENTIFIER",
    pattern: /[A-zA-Z][A-zA-Z0-9]*/,
  })

  function KEYWORD(const1: string) {
    return createToken({
      name: const1,
      pattern: RegExp(const1.toLowerCase()),
      label: "'" + const1.toLowerCase() + "'",
      longer_alt: IDENTIFIER,
    })
  }

  export const CONST = KEYWORD("CONST")
  export const UNIFORM = KEYWORD("UNIFORM")
  export const LAYOUT = KEYWORD("LAYOUT")
  export const CENTROID = KEYWORD("CENTROID")
  export const FLAT = KEYWORD("FLAT")
  export const SMOOTH = KEYWORD("SMOOTH")
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
  export const INOUT = KEYWORD("INOUT")
  export const IN = KEYWORD("IN")
  export const OUT = KEYWORD("OUT")
  export const VOID = KEYWORD("VOID")
  export const STRUCT = KEYWORD("STRUCT")
  export const BOOL = KEYWORD("BOOL")
  export const DISCARD = KEYWORD("DISCARD")
  export const RETURN = KEYWORD("RETURN")
  export const LOWP = KEYWORD("LOWP")
  export const MEDIUMP = KEYWORD("MEDIUMP")
  export const HIGHP = KEYWORD("HIGHP")
  export const TYPE = createToken({
    name: "TYPE",
    pattern: new RegExp(
      [
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
      ].join("|"),
    ),
    longer_alt: IDENTIFIER,
  })
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
    pattern: /\./,
    label: "'.'",
  })
  export const UINTCONSTANT = createToken({
    name: "UINTCONSTANT",
    pattern: /[0-9]+u/,
  })
  export const INTCONSTANT = createToken({
    name: "INTCONSTANT",
    pattern: /[0-9]+/,
  })
}
// IDENTIFIER needs to go last, but must be declared first
// so it can be referenced in longerAlt
const ALL_TOKENS: TokenType[] = Object.values(TOKEN)
pull(ALL_TOKENS, TOKEN.IDENTIFIER)
ALL_TOKENS.push(TOKEN.IDENTIFIER)

const GLSLLexer = new Lexer(ALL_TOKENS, {
  ensureOptimizations: DEV,
})

class GLSLParser extends CstParser {
  precisionQualifier!: (idx: number) => CstNode
  structSpecifier!: (idx: number) => CstNode
  postfixExpression!: (idx: number) => CstNode
  multiplicativeExpression!: (idx: number) => CstNode
  additiveExpression!: (idx: number) => CstNode
  shiftExpression!: (idx: number) => CstNode
  relationalExpression!: (idx: number) => CstNode
  equalityExpression!: (idx: number) => CstNode
  andExpression!: (idx: number) => CstNode
  exclusiveOrExpression!: (idx: number) => CstNode
  inclusiveOrExpression!: (idx: number) => CstNode
  // logicalXorExpression!: (idx: number) => CstNode
  assignmentExpression!: (idx: number) => CstNode
  expression!: (idx: number) => CstNode
  logicalOrExpression!: (idx: number) => CstNode
  conditionalExpression!: (idx: number) => CstNode
  primaryExpression!: (idx: number) => CstNode
  functionCall!: (idx: number) => CstNode
  logicalAndExpression!: (idx: number) => CstNode
  declaration!: (idx: number) => CstNode
  statementList!: (idx?: number) => CstNode
  translationUnit!: (idx?: number) => CstNode
  compoundStatement!: (idx: number) => CstNode
  initDeclaratorList!: (idx: number) => CstNode
  structDeclarationList!: (idx: number) => CstNode
  typeQualifier!: (idx: number) => CstNode
  typeSpecifier!: (idx: number) => CstNode
  constantExpression!: (idx: number) => CstNode
  unaryExpression!: (idx: number) => CstNode
  singleDeclaration!: (idx: number) => CstNode
  fullySpecifiedType!: (idx: number) => CstNode
  initializer!: (idx: number) => CstNode
  storageQualifier!: (idx: number) => CstNode
  layoutQualifier!: (idx: number) => CstNode
  interpolationQualifier!: (idx: number) => CstNode
  invariantQualifier!: (idx: number) => CstNode
  typeSpecifierNoPrec!: (idx: number) => CstNode
  typeSpecifierNonArray!: (idx: number) => CstNode
  declarationNoFunctionPrototype!: (idx: number) => CstNode
  functionDefinitionOrPrototype!: (idx: number) => CstNode
  statement!: (idx: number) => CstNode
  externalDeclaration!: (idx: number) => CstNode
  jumpStatement!: (idx: number) => CstNode
  condition!: (idx: number) => CstNode
  iterationStatement!: (idx: number) => CstNode
  selectionStatement!: (idx: number) => CstNode
  switchStatement!: (idx: number) => CstNode
  caseLabel!: (idx: number) => CstNode

  constructor() {
    super(ALL_TOKENS, { skipValidations: !DEV })

    const $ = this

    function CONSUME_OR(...tokens: TokenType[]) {
      return $.OR9(tokens.map((t) => ({ ALT: () => $.CONSUME(t) })))
    }

    function ORR1<T>(...alts: (() => T)[]) {
      return $.OR1<T>(alts.map((a) => ({ ALT: a })))
    }

    function ORR2<T>(...alts: (() => T)[]) {
      return $.OR2<T>(alts.map((a) => ({ ALT: a })))
    }

    function ORR3<T>(...alts: (() => T)[]) {
      return $.OR3<T>(alts.map((a) => ({ ALT: a })))
    }

    function LEFT_ASSOC(rule: (idx: number) => CstNode, ...tok: TokenType[]) {
      let result = $.SUBRULE1(rule)
      $.MANY(() => {
        const op = CONSUME_OR(...tok)
        const rhs = $.SUBRULE2(rule)
      })
      return result
    }

    //
    // $.RULE("type", () =>
    //   $.OR([
    //     { ALT: () => $.CONSUME(TOKEN.TYPE) },
    //     {
    //       ALT: () => {},
    //     },
    //     { ALT: () => $.CONSUME(TOKEN.IDENTIFIER) },
    //     { ALT: () => $.SUBRULE($.structSpecifier) },
    // )

    // variableIdentifier:
    //     IDENTIFIER
    // primaryExpression:
    //     variableIdentifier
    //     INTCONSTANT
    //     UINTCONSTANT
    //     FLOATCONSTANT
    //     BOOLCONSTANT
    //     LEFT_PAREN expression RIGHT_PAREN
    $.RULE("primaryExpression", () =>
      ORR2(
        () => {
          $.CONSUME(TOKEN.LEFT_PAREN)
          $.SUBRULE($.expression)
          $.CONSUME(TOKEN.RIGHT_PAREN)
        },
        () =>
          CONSUME_OR(
            TOKEN.IDENTIFIER,
            TOKEN.INTCONSTANT,
            TOKEN.UINTCONSTANT,
            TOKEN.FLOATCONSTANT,
            TOKEN.BOOLCONSTANT,
          ),
      ),
    )
    // postfixExpression:
    //     primaryExpression
    //     postfixExpression LEFT_BRACKET integerExpression RIGHT_BRACKET
    //     functionCall
    //     postfixExpression DOT FIELD_SELECTION
    //     postfixExpression INC_OP
    //     postfixExpression DEC_OP
    $.RULE("postfixExpression", () => {
      ORR3(
        () => $.SUBRULE($.functionCall),
        () => $.SUBRULE($.primaryExpression),
      )
      $.MANY(() =>
        ORR2(
          () => {
            $.CONSUME(TOKEN.LEFT_BRACKET)
            $.SUBRULE($.expression)
            $.CONSUME(TOKEN.RIGHT_BRACKET)
          },
          () => {
            $.CONSUME(TOKEN.DOT)
            $.CONSUME(TOKEN.IDENTIFIER)
          },
          () => CONSUME_OR(TOKEN.INC_OP, TOKEN.DEC_OP),
        ),
      )
    })
    // integerExpression:
    //     expression
    // functionCall:
    //     functionCallOrMethod
    // functionCallOrMethod:
    //     functionCallGeneric
    //     postfixExpression DOT functionCallGeneric
    // functionCallGeneric:
    //     functionCallHeaderWithParameters RIGHT_PAREN
    //     functionCallHeaderNoParameters RIGHT_PAREN
    // functionCallHeaderNoParameters:
    //     functionCallHeader VOID
    //     functionCallHeader
    // functionCallHeaderWithParameters:
    //     functionCallHeader assignmentExpression
    //     functionCallHeaderWithParameters COMMA assignmentExpression
    // functionCallHeader:
    //     functionIdentifier LEFT_PAREN
    //     // GramNote: Constructors look like functions, but lexical analysis recognized most of them as
    //     // keywords.  They are now recognized through “typeSpecifier”.
    //     // Methods (.length) and identifiers are recognized through postfixExpression.
    $.RULE("functionCall", () => {
      ORR1(
        () => $.CONSUME(TOKEN.TYPE),
        () => $.CONSUME(TOKEN.IDENTIFIER),
      )
      $.CONSUME(TOKEN.LEFT_PAREN)
      $.MANY_SEP({
        DEF: () => $.SUBRULE($.assignmentExpression),
        SEP: TOKEN.COMMA,
      })
      $.CONSUME(TOKEN.RIGHT_PAREN)
    })
    // functionIdentifier:
    //     typeSpecifier
    //     IDENTIFIER
    //     FIELD_SELECTION
    // unaryExpression:
    //     postfixExpression
    //     INC_OP unaryExpression
    //     DEC_OP unaryExpression
    //     unaryOperator unaryExpression
    //     // GramNote:  No traditional style type casts.
    // unaryOperator:
    //     PLUS
    //     DASH
    //     BANG
    //     TILDE
    //     // GramNote:  No '*' or '&' unary ops.  Pointers are not supported.
    $.RULE("unaryExpression", () =>
      $.OR([
        { ALT: () => $.SUBRULE1(this.postfixExpression) },
        {
          ALT: () => {
            CONSUME_OR(
              TOKEN.INC_OP,
              TOKEN.DEC_OP,
              TOKEN.PLUS,
              TOKEN.DASH,
              TOKEN.BANG,
              TOKEN.TILDE,
            )
            $.SUBRULE2(this.unaryExpression)
          },
        },
      ]),
    )
    // multiplicativeExpression:
    //     unaryExpression
    //     multiplicativeExpression STAR unaryExpression
    //     multiplicativeExpression SLASH unaryExpression
    //     multiplicativeExpression PERCENT unaryExpression
    $.RULE("multiplicativeExpression", () =>
      LEFT_ASSOC(this.unaryExpression, TOKEN.STAR, TOKEN.SLASH, TOKEN.PERCENT),
    )
    // additiveExpression:
    //     multiplicativeExpression
    //     additiveExpression PLUS multiplicativeExpression
    //     additiveExpression DASH multiplicativeExpression
    $.RULE("additiveExpression", () =>
      LEFT_ASSOC(this.multiplicativeExpression, TOKEN.PLUS, TOKEN.DASH),
    )
    // shiftExpression:
    //     additiveExpression
    //     shiftExpression LEFTOP additiveExpression
    //     shiftExpression RIGHTOP additiveExpression
    $.RULE("shiftExpression", () =>
      LEFT_ASSOC(this.additiveExpression, TOKEN.LEFTOP, TOKEN.RIGHTOP),
    )
    // relationalExpression:
    //     shiftExpression
    //     relationalExpression LEFTANGLE shiftExpression
    //     relationalExpression RIGHTANGLE shiftExpression
    //     relationalExpression LEOP shiftExpression
    //     relationalExpression GEOP shiftExpression
    $.RULE("relationalExpression", () =>
      LEFT_ASSOC(
        this.shiftExpression,
        TOKEN.LEFTANGLE,
        TOKEN.RIGHTANGLE,
        TOKEN.LEOP,
        TOKEN.GEOP,
      ),
    )
    // equalityExpression:
    //     relationalExpression
    //     equalityExpression EQOP relationalExpression
    //     equalityExpression NEOP relationalExpression
    $.RULE("equalityExpression", () =>
      LEFT_ASSOC(this.relationalExpression, TOKEN.EQOP, TOKEN.NEOP),
    )
    // andExpression:
    //     equalityExpression
    //     andExpression AMPERSAND equalityExpression
    $.RULE("andExpression", () =>
      LEFT_ASSOC(this.equalityExpression, TOKEN.AMPERSAND),
    )
    // exclusiveOrExpression:
    //     andExpression
    //     exclusiveOrExpression CARET andExpression
    $.RULE("exclusiveOrExpression", () =>
      LEFT_ASSOC(this.andExpression, TOKEN.CARET),
    )
    // inclusiveOrExpression:
    //     exclusiveOrExpression
    //     inclusiveOrExpression VERTICALBAR exclusiveOrExpression
    $.RULE("inclusiveOrExpression", () =>
      LEFT_ASSOC(this.exclusiveOrExpression, TOKEN.VERTICALBAR),
    )
    // logicalAndExpression:
    //     inclusiveOrExpression
    //     logicalAndExpression AND_OP inclusiveOrExpression
    $.RULE("logicalAndExpression", () =>
      LEFT_ASSOC(this.inclusiveOrExpression, TOKEN.AND_OP),
    )
    // logicalXorExpression:
    //     logicalAndExpression
    //     logicalXorExpression XOR_OP logicalAndExpression
    // $.RULE("logicalXorExpression", () =>
    //   LEFT_ASSOC(this.logicalAndExpression, TOKEN.XOR_OP),
    // )
    // logicalOrExpression:
    //     logicalXorExpression
    //     logicalOrExpression OR_OP logicalXorExpression
    $.RULE("logicalOrExpression", () =>
      LEFT_ASSOC(this.logicalAndExpression, TOKEN.OR_OP),
    )
    // conditionalExpression:
    //     logicalOrExpression
    //     logicalOrExpression QUESTION expression COLON assignmentExpression
    $.RULE("conditionalExpression", () => {
      $.SUBRULE1(this.logicalOrExpression)

      $.OPTION(() => {
        $.CONSUME(TOKEN.QUESTION)
        $.SUBRULE2(this.expression)
        $.CONSUME(TOKEN.COLON)
        $.SUBRULE3(this.assignmentExpression)
      })
    })
    // assignmentExpression:
    //     conditionalExpression
    //     unaryExpression assignmentOperator assignmentExpression
    // assignmentOperator:
    //     EQUAL
    //     MULASSIGN
    //     DIVASSIGN
    //     MODASSIGN
    //     ADDASSIGN
    //     SUBASSIGN
    //     LEFTASSIGN
    //     RIGHTASSIGN
    //     ANDASSIGN
    //     XORASSIGN
    //     ORASSIGN
    // conditionalExpression starts with unaryExpression, so rewrite to
    // assignmentExpression: conditionalExpression (assignmentOperator conditionalExpression)*
    // and do semantic check later.
    $.RULE("assignmentExpression", () => {
      $.SUBRULE($.conditionalExpression)
      $.MANY(() => {
        CONSUME_OR(
          TOKEN.EQUAL,
          TOKEN.MULASSIGN,
          TOKEN.DIVASSIGN,
          TOKEN.MODASSIGN,
          TOKEN.ADDASSIGN,
          TOKEN.SUBASSIGN,
          TOKEN.LEFTASSIGN,
          TOKEN.RIGHTASSIGN,
          TOKEN.ANDASSIGN,
          TOKEN.XORASSIGN,
          TOKEN.ORASSIGN,
        )
        $.SUBRULE1(this.conditionalExpression)
      })
    })
    // expression:
    //     assignmentExpression
    //     expression COMMA assignmentExpression
    $.RULE(
      "expression",
      // () => $.SUBRULE($.assignmentExpression),
      () =>
        $.AT_LEAST_ONE_SEP({
          DEF: () => $.SUBRULE($.assignmentExpression),
          SEP: TOKEN.COMMA,
        }),
    )
    // constantExpression:
    //     conditionalExpression
    $.RULE("constantExpression", () => $.SUBRULE($.conditionalExpression))
    // declaration:
    //     functionPrototype SEMICOLON
    //     initDeclaratorList SEMICOLON
    //     PRECISION precisionQualifier typeSpecifierNoPrec SEMICOLON
    //     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE SEMICOLON
    //     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER SEMICOLON
    //     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER LEFT_BRACKET
    //                                                      constantExpression RIGHT_BRACKET SEMICOLON
    //     typeQualifier SEMICOLON
    $.RULE("declarationNoFunctionPrototypeNoInitDeclaratorList", () =>
      $.OR({
        MAX_LOOKAHEAD: 4,
        DEF: [
          {
            ALT: () => {
              $.CONSUME(TOKEN.PRECISION)
              $.SUBRULE1($.precisionQualifier)
              $.SUBRULE2($.typeSpecifierNoPrec)
              $.CONSUME1(TOKEN.SEMICOLON)
            },
          },
          {
            ALT: () => {
              $.SUBRULE1($.typeQualifier)
              $.OPTION1(() => {
                $.CONSUME1(TOKEN.IDENTIFIER)
                $.CONSUME(TOKEN.LEFT_BRACE)
                $.SUBRULE($.structDeclarationList)
                $.CONSUME(TOKEN.RIGHT_BRACE)
                $.OPTION2(() => {
                  $.CONSUME2(TOKEN.IDENTIFIER)
                  $.OPTION3(() => {
                    $.CONSUME(TOKEN.LEFT_BRACKET)
                    $.SUBRULE($.constantExpression)
                    $.CONSUME(TOKEN.RIGHT_BRACKET)
                  })
                })
              })
              $.CONSUME2(TOKEN.SEMICOLON)
            },
          },
        ],
      }),
    )

    $.RULE("externalDeclaration", (noFunctionDefinition) =>
      $.OR([
        {
          ALT: () => {
            // initDeclaratorList, functionPrototype or functionDefinition
            $.SUBRULE($.fullySpecifiedType)
            $.OR2([
              // functionPrototype
              {
                ALT: () => {
                  $.CONSUME1(TOKEN.IDENTIFIER)
                  $.CONSUME(TOKEN.LEFT_PAREN)
                  $.MANY_SEP({
                    DEF: () => {
                      //     constQualifier
                      $.OPTION1(() => $.CONSUME(TOKEN.CONST))
                      //     parameterQualifier
                      $.OPTION2(() =>
                        $.OR4([
                          { ALT: () => $.CONSUME(TOKEN.IN) },
                          { ALT: () => $.CONSUME(TOKEN.OUT) },
                          { ALT: () => $.CONSUME(TOKEN.INOUT) },
                        ]),
                      )
                      //     precisionQualifier
                      $.OPTION3(() => $.SUBRULE2($.precisionQualifier))
                      $.CONSUME2(TOKEN.TYPE)
                      $.CONSUME2(TOKEN.IDENTIFIER)
                      //arraySpecifier
                      $.OPTION4(() => {
                        $.CONSUME4(TOKEN.LEFT_BRACKET)
                        $.CONSUME(TOKEN.INTCONSTANT)
                        $.CONSUME4(TOKEN.RIGHT_BRACKET)
                      })
                      // $.CONSUME()
                    },
                    SEP: TOKEN.COMMA,
                  })
                  $.CONSUME(TOKEN.RIGHT_PAREN)
                  $.OR3([
                    { ALT: () => $.CONSUME(TOKEN.SEMICOLON) },
                    {
                      // GATE: () => !noFunctionDefinition,
                      ALT: () => $.SUBRULE($.compoundStatement),
                      IGNORE_AMBIGUITIES: false,
                    },
                  ])
                },
              },
              // initDeclaratorList
              {
                ALT: () => {
                  $.MANY_SEP2({
                    SEP: TOKEN.COMMA,
                    DEF: () => {
                      $.CONSUME3(TOKEN.IDENTIFIER)
                      $.OPTION5(() => {
                        $.CONSUME(TOKEN.LEFT_BRACKET)
                        $.OPTION6(() => $.SUBRULE($.constantExpression))
                        $.CONSUME(TOKEN.RIGHT_BRACKET)
                      })
                      $.OPTION7(() => {
                        $.CONSUME(TOKEN.EQUAL)
                        $.SUBRULE($.initializer)
                      })
                    },
                  })
                  $.CONSUME2(TOKEN.SEMICOLON)
                },
              },
            ])
          },
        },
      ]),
    )
    $.RULE("declaration", () =>
      $.SUBRULE($.externalDeclaration, { ARGS: [true] }),
    )
    $.RULE("declarationNoFunctionPrototype", () => {
      $.OR({
        MAX_LOOKAHEAD: 4,
        DEF: [
          {
            ALT: () => $.SUBRULE1($.initDeclaratorList),
          },
          {
            ALT: () => {
              $.CONSUME1(TOKEN.PRECISION)
              $.SUBRULE1($.precisionQualifier)
              $.SUBRULE2($.initDeclaratorList)
            },
          },
        ],
      })
      $.CONSUME(TOKEN.SEMICOLON)
    })
    // functionPrototype:
    //     functionDeclarator RIGHT_PAREN
    // functionDeclarator:
    //     functionHeader
    //     functionHeaderWithParameters
    // functionHeaderWithParameters:
    //     functionHeader parameterDeclaration
    //     functionHeaderWithParameters COMMA parameterDeclaration
    // functionHeader:
    //     fullySpecifiedType IDENTIFIER LEFT_PAREN
    // parameterDeclarator:
    //     typeSpecifier IDENTIFIER
    //     typeSpecifier IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
    // parameterDeclaration:
    //     parameterTypeQualifier parameterQualifier parameterDeclarator
    //     parameterQualifier parameterDeclarator
    //     parameterTypeQualifier parameterQualifier parameterTypeSpecifier
    //     parameterQualifier parameterTypeSpecifier
    // parameterQualifier:
    //     /* empty */
    //     IN
    //     OUT
    //     INOUT
    // parameterTypeSpecifier:
    //     typeSpecifier

    // initDeclaratorList:
    //     singleDeclaration
    //     initDeclaratorList COMMA IDENTIFIER
    //     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
    //     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
    //     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET EQUAL initializer
    //     initDeclaratorList COMMA IDENTIFIER EQUAL initializer
    $.RULE("initDeclaratorList", () => {
      $.SUBRULE($.singleDeclaration)
    })
    // singleDeclaration:
    //     fullySpecifiedType
    //     fullySpecifiedType IDENTIFIER
    //     fullySpecifiedType IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
    //     fullySpecifiedType IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
    //     fullySpecifiedType IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET EQUAL initializer
    //     fullySpecifiedType IDENTIFIER EQUAL initializer
    //     INVARIANT IDENTIFIER
    //     // GramNote:  No 'enum', or 'typedef'.
    $.RULE("singleDeclaration", () =>
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
          ALT: () => {
            $.CONSUME(TOKEN.INVARIANT)
            $.CONSUME2(TOKEN.IDENTIFIER)
          },
        },
      ]),
    )
    // fullySpecifiedType:
    //     typeSpecifier
    //     typeQualifier typeSpecifier
    $.RULE("fullySpecifiedType", () => {
      $.OPTION(() => $.SUBRULE($.typeQualifier))
      $.SUBRULE($.typeSpecifier)
    })
    // invariantQualifier:
    //     INVARIANT
    // interpolationQualifier:
    //     SMOOTH
    //     FLAT
    $.RULE("interpolationQualifier", () => CONSUME_OR(TOKEN.SMOOTH, TOKEN.FLAT))
    // layoutQualifier:
    //     LAYOUT LEFT_PAREN layoutQualifierIdList RIGHT_PAREN
    // layoutQualifierIdList:
    //     layoutQualifierId
    //     layoutQualifierIdList COMMA layoutQualifierId
    // layoutQualifierId:
    //     IDENTIFIER
    //     IDENTIFIER EQUAL INTCONSTANT
    //     IDENTIFIER EQUAL UINTCONSTANT
    $.RULE("layoutQualifier", () => {
      $.CONSUME(TOKEN.LAYOUT)
      $.CONSUME(TOKEN.LEFT_PAREN)
      $.AT_LEAST_ONE_SEP({
        SEP: TOKEN.COMMA,
        DEF: () => {
          $.CONSUME(TOKEN.IDENTIFIER)
          $.OPTION(() => {
            $.CONSUME(TOKEN.EQUAL)
            CONSUME_OR(TOKEN.INTCONSTANT, TOKEN.UINTCONSTANT)
          })
        },
      })
    })
    // parameterTypeQualifier:
    //     CONST
    // typeQualifier:
    //     storageQualifier
    //     layoutQualifier
    //     layoutQualifier storageQualifier
    //     interpolationQualifier
    //     interpolationQualifier storageQualifier
    //     invariantQualifier storageQualifier
    //     invariantQualifier interpolationQualifier storageQualifier
    $.RULE("typeQualifier", () =>
      $.OR([
        {
          ALT: () => {
            $.SUBRULE1($.storageQualifier)
          },
        },
        {
          ALT: () => {
            $.SUBRULE2($.layoutQualifier)
            $.OPTION1(() => $.SUBRULE3($.storageQualifier))
          },
        },
        {
          ALT: () => {
            $.SUBRULE4($.interpolationQualifier)
            $.OPTION2(() => $.SUBRULE5($.storageQualifier))
          },
        },
        {
          ALT: () => {
            // $.SUBRULE($.invariantQualifier)
            $.CONSUME(TOKEN.INVARIANT)
            $.OPTION3(() => $.SUBRULE6($.interpolationQualifier))
            $.SUBRULE7($.storageQualifier)
          },
        },
      ]),
    )
    // storageQualifier:
    //     CONST
    //     IN
    //     OUT
    //     CENTROID IN
    //     CENTROID OUT
    //     UNIFORM
    $.RULE("storageQualifier", () =>
      ORR1<void>(
        () => $.CONSUME(TOKEN.CONST),
        () => {
          $.OPTION(() => $.CONSUME(TOKEN.CENTROID))
          CONSUME_OR(TOKEN.IN, TOKEN.OUT)
        },
        () => $.CONSUME(TOKEN.UNIFORM),
      ),
    )
    // typeSpecifier:
    //     typeSpecifierNoPrec
    //     precisionQualifier typeSpecifierNoPrec
    $.RULE("typeSpecifier", () => {
      $.OPTION(() => $.SUBRULE($.precisionQualifier))
      $.SUBRULE($.typeSpecifierNoPrec)
    })
    // typeSpecifierNoPrec:
    //     typeSpecifierNonarray
    //     typeSpecifierNonarray LEFT_BRACKET RIGHT_BRACKET
    //     typeSpecifierNonarray LEFT_BRACKET constantExpression RIGHT_BRACKET
    $.RULE("typeSpecifierNoPrec", () => {
      $.SUBRULE($.typeSpecifierNonArray)
      $.OPTION1(() => {
        $.CONSUME(TOKEN.LEFT_BRACKET)
        $.OPTION2(() => $.SUBRULE($.constantExpression))
        $.CONSUME(TOKEN.RIGHT_BRACKET)
      })
    })
    // typeSpecifierNonarray:
    //     VOID
    //     FLOAT
    //     INT
    //     UINT
    //     BOOL
    //     VEC2
    //     VEC3
    //     VEC4
    //     BVEC2
    //     BVEC3
    //     BVEC4
    //     IVEC2
    //     IVEC3
    //     IVEC4
    //     UVEC2
    //     UVEC3
    //     UVEC4
    //     MAT2
    //     MAT3
    //     MAT4
    //     MAT2X2
    //     MAT2X3
    //     MAT2X4
    //     MAT3X2
    //     MAT3X3
    //     MAT3X4
    //     MAT4X2
    //     MAT4X3
    //     MAT4X4
    //     SAMPLER2D
    //     SAMPLER3D
    //     SAMPLERCUBE
    //     SAMPLER2DSHADOW
    //     SAMPLERCUBESHADOW
    //     SAMPLER2DARRAY
    //     SAMPLER2DARRAYSHADOW
    //     ISAMPLER2D
    //     ISAMPLER3D
    //     ISAMPLERCUBE
    //     ISAMPLER2DARRAY
    //     USAMPLER2D
    //     USAMPLER3D
    //     USAMPLERCUBE
    //     USAMPLER2DARRAY
    //     structSpecifier
    //     TYPE_NAME
    $.RULE("typeSpecifierNonArray", () =>
      $.OR([
        { ALT: () => $.CONSUME(TOKEN.TYPE) },
        { ALT: () => $.CONSUME(TOKEN.VOID) },
        { ALT: () => $.SUBRULE($.structSpecifier) },
        { ALT: () => $.CONSUME(TOKEN.IDENTIFIER) },
      ]),
    )
    // precisionQualifier:
    //         HIGH_PRECISION
    //         MEDIUM_PRECISION
    //         LOW_PRECISION
    $.RULE("precisionQualifier", () =>
      $.OR([
        { ALT: () => $.CONSUME(TOKEN.HIGHP) },
        { ALT: () => $.CONSUME(TOKEN.MEDIUMP) },
        { ALT: () => $.CONSUME(TOKEN.LOWP) },
      ]),
    )

    // structSpecifier:
    //         STRUCT IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE
    //         STRUCT LEFT_BRACE structDeclarationList RIGHT_BRACE

    $.RULE("structSpecifier", () => {
      $.CONSUME(TOKEN.STRUCT)
      $.OPTION2(() => $.CONSUME(TOKEN.IDENTIFIER))
      $.CONSUME(TOKEN.LEFT_BRACE)
      $.SUBRULE($.structDeclarationList)
      $.CONSUME(TOKEN.RIGHT_BRACE)
    })
    // structDeclarationList:
    //         structDeclaration
    //         structDeclarationList structDeclaration
    // structDeclaration:
    //         typeSpecifier structDeclaratorList SEMICOLON
    //         typeQualifier typeSpecifier structDeclaratorList SEMICOLON
    // structDeclaratorList:
    //         structDeclarator
    //         structDeclaratorList COMMA structDeclarator
    // structDeclarator:
    //         IDENTIFIER
    //         IDENTIFIER LEFT_BRACKET RIGHT_BRACKET
    //         IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
    $.RULE("structDeclarationList", () =>
      $.MANY(() => {
        $.OPTION1(() => $.SUBRULE($.typeQualifier))
        $.SUBRULE($.typeSpecifier)
        $.MANY_SEP({
          SEP: TOKEN.COMMA,
          DEF: () => {
            $.CONSUME(TOKEN.IDENTIFIER)
            $.OPTION2(() => {
              $.CONSUME(TOKEN.LEFT_BRACKET)
              $.OPTION3(() => $.SUBRULE($.constantExpression))
              $.CONSUME(TOKEN.RIGHT_BRACKET)
            })
          },
        })
        $.CONSUME(TOKEN.SEMICOLON)
      }),
    )
    // initializer:
    //         assignmentExpression
    $.RULE("initializer", () => $.SUBRULE($.assignmentExpression))
    // declarationStatement:
    //         declaration
    // statement:
    //         compoundStatementWithScope
    //         simpleStatement
    // statementNoNewScope:
    //         compoundStatementNoNewScope
    //         simpleStatement
    // statementWithScope:
    //         compoundStatementNoNewScope
    //         simpleStatement
    // // Grammar Note:  labeled statements for SWITCH only; 'goto' is not supported.
    // simpleStatement:
    //         declarationStatement
    //         expressionStatement
    //         selectionStatement
    //         switchStatement
    //         caseLabel
    //         iterationStatement
    //         jumpStatement
    $.RULE("statement", () =>
      $.OR([
        // declarationStatement
        {
          GATE: $.BACKTRACK($.singleDeclaration),
          ALT: () => $.SUBRULE($.declaration),
        },
        // expressionStatement
        {
          ALT: () => {
            $.OPTION(() => $.SUBRULE($.expression))
            $.CONSUME(TOKEN.SEMICOLON)
          },
        },
        { ALT: () => $.SUBRULE($.selectionStatement) },
        { ALT: () => $.SUBRULE($.switchStatement) },
        { ALT: () => $.SUBRULE($.caseLabel) },
        { ALT: () => $.SUBRULE($.iterationStatement) },
        { ALT: () => $.SUBRULE($.jumpStatement) },
        { ALT: () => $.SUBRULE($.compoundStatement) },
      ]),
    )
    // compoundStatementWithScope:
    //         LEFT_BRACE RIGHT_BRACE
    //         LEFT_BRACE statementList RIGHT_BRACE
    // compoundStatementNoNewScope:
    //         LEFT_BRACE RIGHT_BRACE
    //         LEFT_BRACE statementList RIGHT_BRACE
    // statementList:
    //         statement
    //         statementList statement
    $.RULE("compoundStatement", () => {
      $.CONSUME(TOKEN.LEFT_BRACE)
      $.MANY(() => $.SUBRULE($.statement))
      $.CONSUME(TOKEN.RIGHT_BRACE)
    })
    // expressionStatement:
    //         SEMICOLON
    //         expression SEMICOLON
    // selectionStatement:
    //         IF LEFT_PAREN expression RIGHT_PAREN selectionRestStatement
    // selectionRestStatement:
    //         statementWithScope ELSE statementWithScope
    //         statementWithScope
    $.RULE("selectionStatement", () => {
      $.CONSUME(TOKEN.IF)
      $.CONSUME(TOKEN.LEFT_PAREN)
      $.SUBRULE($.expression)
      $.CONSUME(TOKEN.RIGHT_PAREN)
      $.SUBRULE2($.statement)
      $.OPTION(() => {
        $.CONSUME(TOKEN.ELSE)
        $.SUBRULE3($.statement)
      })
    })
    // condition:
    //         expression
    //         fullySpecifiedType IDENTIFIER EQUAL initializer
    $.RULE("condition", () =>
      $.OR({
        MAX_LOOKAHEAD: 4,
        DEF: [
          {
            GATE: $.BACKTRACK($.singleDeclaration),
            ALT: () => {
              $.SUBRULE2($.fullySpecifiedType)
              $.CONSUME(TOKEN.IDENTIFIER)
              $.CONSUME(TOKEN.EQUAL)
              $.SUBRULE3($.initializer)
            },
          },
          {
            ALT: () => $.SUBRULE($.expression),
          },
        ],
      }),
    )
    // switchStatement:
    //         SWITCH LEFT_PAREN expression RIGHT_PAREN LEFT_BRACE switchStatementList RIGHT_BRACE
    // switchStatementList:
    //         /* nothing */
    //         statementList
    $.RULE("switchStatement", () => {
      $.CONSUME(TOKEN.SWITCH)
      $.CONSUME(TOKEN.LEFT_PAREN)
      $.SUBRULE($.expression)
      $.CONSUME(TOKEN.RIGHT_PAREN)
      $.CONSUME(TOKEN.LEFT_BRACE)
      $.MANY(() => $.SUBRULE($.statement))
      $.CONSUME(TOKEN.RIGHT_BRACE)
    })
    // caseLabel:
    //         CASE expression COLON
    //         DEFAULT COLON
    $.RULE("caseLabel", () =>
      $.OR([
        {
          ALT: () => {
            $.CONSUME(TOKEN.CASE)
            $.SUBRULE($.expression)
            $.CONSUME(TOKEN.COLON)
          },
        },
        {
          ALT: () => {
            $.CONSUME2(TOKEN.DEFAULT)
            $.CONSUME2(TOKEN.COLON)
          },
        },
      ]),
    )
    // iterationStatement:
    //         WHILE LEFT_PAREN condition RIGHT_PAREN statementNoNewScope
    //         DO statementWithScope WHILE LEFT_PAREN expression RIGHT_PAREN SEMICOLON
    //         FOR LEFT_PAREN forInitStatement forRestStatement RIGHT_PAREN
    // statementNoNewScope
    // forInitStatement:
    //         expressionStatement
    //         declarationStatement
    // conditionopt:
    //         condition
    //         /* empty */
    // forRestStatement:
    //         conditionopt SEMICOLON
    //         conditionopt SEMICOLON expression
    $.RULE("iterationStatement", () =>
      $.OR([
        {
          ALT: () => {
            $.CONSUME(TOKEN.WHILE)
            $.CONSUME(TOKEN.LEFT_PAREN)
            $.SUBRULE($.condition)
            $.CONSUME(TOKEN.RIGHT_PAREN)
            $.SUBRULE($.statement)
          },
        },
        {
          ALT: () => {
            $.CONSUME2(TOKEN.DO)
            $.SUBRULE2($.statement)
            $.CONSUME2(TOKEN.WHILE)
            $.CONSUME2(TOKEN.LEFT_PAREN)
            $.SUBRULE2($.expression)
            $.CONSUME2(TOKEN.RIGHT_PAREN)
            $.CONSUME2(TOKEN.SEMICOLON)
          },
        },
        {
          ALT: () => {
            $.CONSUME3(TOKEN.FOR)
            $.CONSUME3(TOKEN.LEFT_PAREN)
            $.OR3([
              {
                GATE: $.BACKTRACK($.singleDeclaration),
                ALT: () => $.SUBRULE($.declaration),
              },
              { ALT: () => $.CONSUME1(TOKEN.SEMICOLON) },
              {
                ALT: () => {
                  $.SUBRULE3($.expression)
                  $.CONSUME3(TOKEN.SEMICOLON)
                },
              },
            ])
            $.OPTION3(() => $.SUBRULE3($.condition))
            $.CONSUME4(TOKEN.SEMICOLON)
            $.OPTION4(() => $.SUBRULE4($.expression))
            $.CONSUME3(TOKEN.RIGHT_PAREN)
            $.SUBRULE3($.statement)
          },
        },
      ]),
    )
    // jumpStatement:
    //         CONTINUE SEMICOLON
    //         BREAK SEMICOLON
    //         RETURN SEMICOLON
    //         RETURN expression SEMICOLON
    //         DISCARD SEMICOLON   // Fragment shader only.
    // // Grammar Note:  No 'goto'.  Gotos are not supported.
    $.RULE("jumpStatement", () => {
      $.OR([
        { ALT: () => $.CONSUME(TOKEN.CONTINUE) },
        { ALT: () => $.CONSUME(TOKEN.BREAK) },
        { ALT: () => $.CONSUME(TOKEN.DISCARD) },
        {
          ALT: () => {
            $.CONSUME(TOKEN.RETURN)
            $.OPTION(() => $.SUBRULE($.expression))
          },
        },
      ])
      $.CONSUME(TOKEN.SEMICOLON)
    })
    // translationUnit:
    //         externalDeclaration
    //         translationUnit externalDeclaration
    // externalDeclaration:
    //         functionDefinition
    //         declaration
    $.RULE("translationUnit", () =>
      $.AT_LEAST_ONE(() => $.SUBRULE($.externalDeclaration)),
    )

    // functionDefinition:
    //         functionPrototype compoundStatementNoNewScope

    this.performSelfAnalysis()
  }
}

// ONLY ONCE
const glslParser = new GLSLParser()

// create the HTML Text
const htmlText = createSyntaxDiagramsCode(
  glslParser.getSerializedGastProductions(),
)
// Write the HTML file to disk
writeFileSync(path.join(__dirname, "./generated_diagrams.html"), htmlText)

const shader = fs.readFileSync("./fixtures/shader.glsl", {
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
function parseInput(text: string) {
  const lexingResult = GLSLLexer.tokenize(text)
  checkLexingErrors(text, lexingResult)

  let message = lexingResult.tokens.map(
    (t) => `${t.tokenType.name}(${t.image})`,
  )
  // console.log(message)

  // "input" is a setter which will reset the glslParser's state.
  glslParser.input = lexingResult.tokens
  const result = glslParser.translationUnit()

  checkParsingErrors(text, glslParser.errors)
  return result
}
console.time("parsing")
const cst = parseInput(shader)
console.timeEnd("parsing")
fs.writeFileSync("./cst.json", JSON.stringify(cst, null, "  "), {
  encoding: "utf8",
})
console.log("PARSER SUCCESS!!!".green)
