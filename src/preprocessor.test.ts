import { parseInput } from "./parser"
import { GLSL_LEXER, lex } from "./lexer"
import { preproc } from "./preprocessor"

test("preproc directives may only be preceded by whitespace", () => {
  parseInput("int i; #define AA 2")
  throw new Error()
})
test("macro name starting with GL_ is not allowed", () => {
  parseInput("#define GL_TEST")
  throw new Error()
})
test("preproc works", () => {
  expect(
    preproc(
      lex(`#version 300 es
  #define MAX3(genType) genType max3(genType a, genType b, genType c) {\\
    return max(a, max(b, c));\\
  }
  
  MAX3(float)
  MAX3(vec3)
  
  #pragma glslify: export(max3)
  `),
    ),
  ).toEqual([])
})
