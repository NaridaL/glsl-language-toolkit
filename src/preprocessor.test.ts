import { parseInput } from "./parser"
import { lex } from "./lexer"
import { applyLineContinuations, preproc } from "./preprocessor"
import { Token } from "./nodes"

const images = (toks: Token[]) => toks.map((t) => t.image)

test("preproc directives may only be preceded by whitespace", () => {
  parseInput("int i; #define AA 2")
  throw new Error()
})
test("macro name starting with GL_ is not allowed", () => {
  parseInput("#define GL_TEST")
  throw new Error()
})
test("error to redefine builtin macro name", () => {
  parseInput("#define __LINE__ 2")
  throw new Error()
})
test("error to undefine builtin macro name", () => {
  parseInput("#undef __LINE__ 2")
  throw new Error()
})

test("object macro", () => {
  const source = `
  #define X vec3(1.)
  
  vec3 v = X;
  `
  expect(images(preproc(source))).toEqual(images(lex(`vec3 v = vec3(1.);`)))
})

test("function macro", () => {
  const source = `
  #define V(X) vec3(X)
  
  vec3 v = V(1);
  `
  expect(images(preproc(source))).toEqual(images(lex(`vec3 v = vec3(1);`)))
})

test("preproc works", () => {
  const source = `#version 300 es
#define MAX3(genType) genType max3(genType a, genType b, genType c) {\\
return max(a, max(b, c));\\
}

MAX3(float)
MAX3(vec3)

#pragma glslify: export(max3)
`
  expect(images(preproc(source))).toEqual(
    images(
      lex(`
      
      float max3(float a, float b, float c) {
        return max(a, max(b, c));
      }
      vec3 max3(vec3 a, vec3 b, vec3 c) {
        return max(a, max(b, c)); 
      }
      `),
    ),
  )
})

test("applyLineContinuation", () => {
  expect(applyLineContinuations("aa\\\r\nbb cc\ngg")).toEqual({
    result: "aabb cc \r\n\ngg",
    changes: [
      {
        originalOffset: 5,
        newOffset: 2,
        length: 5,
        lineDiff: -1,
        columnDiff: 2,
      },
    ],
  })
  expect(applyLineContinuations("aa\\\nbb\\\ncc\ngg")).toEqual({
    result: "aabbcc \n \n\ngg",
    changes: [
      {
        originalOffset: 4,
        newOffset: 2,
        length: 2,
        lineDiff: -1,
        columnDiff: 2,
      },
      {
        originalOffset: 8,
        newOffset: 4,
        length: 2,
        lineDiff: -2,
        columnDiff: 4,
      },
    ],
  })
})
