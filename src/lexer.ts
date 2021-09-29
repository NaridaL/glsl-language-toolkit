// noinspection JSUnusedGlobalSymbols

import { createToken, Lexer, TokenType } from "chevrotain"
import { pull } from "lodash"
import { DEV } from "./util"

export namespace TOKEN {
  // Categories

  export const ASSIGN_OP = createToken({ name: "ASSIGN_OP", pattern: Lexer.NA })
  export const UNARY_OP = createToken({ name: "PREFIX_OP", pattern: Lexer.NA })
  export const POSTFIX_OP = createToken({
    name: "POSTFIX_OP",
    pattern: Lexer.NA,
  })
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
    categories: [UNARY_OP, POSTFIX_OP],
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
    categories: [UNARY_OP, POSTFIX_OP],
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
    categories: [UNARY_OP, ADDITIVE_OP],
  })
  export const TILDE = createToken({
    name: "TILDE",
    pattern: "~",
    label: "'~'",
    categories: UNARY_OP,
  })
  export const BANG = createToken({
    name: "BANG",
    pattern: "!",
    label: "'!'",
    categories: UNARY_OP,
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
  export const VERTICAL_BAR = createToken({
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
    categories: [UNARY_OP, ADDITIVE_OP],
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
      pattern: const1.toLowerCase(),
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
  export const CONSTANT = createToken({ name: "CONSTANT", pattern: Lexer.NA })
  export const BASIC_TYPE = createToken({
    name: "BASIC_TYPE",
    pattern: Lexer.NA,
  })
  function createBasicType(t: string) {
    return createToken({
      name: t.toUpperCase(),
      pattern: t,
      longer_alt: IDENTIFIER,
      categories: BASIC_TYPE,
    })
  }
  export const BOOL = createBasicType("bool")
  export const INT = createBasicType("int")
  export const FLOAT = createBasicType("float")
  export const MAT2 = createBasicType("mat2")
  export const MAT3 = createBasicType("mat3")
  export const MAT4 = createBasicType("mat4")
  export const MAT2X2 = createBasicType("mat2x2")
  export const MAT2X3 = createBasicType("mat2x3")
  export const MAT2X4 = createBasicType("mat2x4")
  export const MAT3X2 = createBasicType("mat3x2")
  export const MAT3X3 = createBasicType("mat3x3")
  export const MAT3X4 = createBasicType("mat3x4")
  export const MAT4X2 = createBasicType("mat4x2")
  export const MAT4X3 = createBasicType("mat4x3")
  export const MAT4X4 = createBasicType("mat4x4")
  export const VEC2 = createBasicType("vec2")
  export const VEC3 = createBasicType("vec3")
  export const VEC4 = createBasicType("vec4")
  export const IVEC2 = createBasicType("ivec2")
  export const IVEC3 = createBasicType("ivec3")
  export const IVEC4 = createBasicType("ivec4")
  export const BVEC2 = createBasicType("bvec2")
  export const BVEC3 = createBasicType("bvec3")
  export const BVEC4 = createBasicType("bvec4")
  export const UINT = createBasicType("uint")
  export const UVEC2 = createBasicType("uvec2")
  export const UVEC3 = createBasicType("uvec3")
  export const UVEC4 = createBasicType("uvec4")
  export const BASIC_TYPES = [
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
  ].map(createBasicType)
  export const IN = KEYWORD("IN", PARAMETER_QUALIFIER)
  export const BOOLCONSTANT = createToken({
    name: "BOOLCONSTANT",
    pattern: /true|false/,
    longer_alt: IDENTIFIER,
    categories: CONSTANT,
  })
  export const FLOATCONSTANT = createToken({
    name: "FLOATCONSTANT",
    pattern: /((\d+\.\d*|\.\d+)(e[+\-]?\d+)?|\d+e[+\-]?\d+)f?/i,
    categories: CONSTANT,
  })
  export const DOT = createToken({
    name: "DOT",
    pattern: ".",
    label: "'.'",
  })
  export const UINTCONSTANT = createToken({
    name: "UINTCONSTANT",
    pattern: /(?:0x)?\d+u/i,
    categories: CONSTANT,
  })
  export const INTCONSTANT = createToken({
    name: "INTCONSTANT",
    pattern: /(?:0x)?\d+/,
    categories: CONSTANT,
  })
}
// IDENTIFIER needs to go last, but must be declared first
// so it can be referenced in longerAlt
export const ALL_TOKENS = pull(Object.values(TOKEN), TOKEN.IDENTIFIER).flatMap(
  (x) => (Array.isArray(x) ? x : [x]),
)
ALL_TOKENS.push(TOKEN.IDENTIFIER)

export const GLSL_LEXER = new Lexer(ALL_TOKENS, { ensureOptimizations: DEV })
