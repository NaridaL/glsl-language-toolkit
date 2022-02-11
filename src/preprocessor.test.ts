import "./index"
import { lex } from "./lexer"
import { applyLineContinuations, preproc } from "./preprocessor"
import { Token } from "./nodes"

const images = (toks: Token[]) => toks.map((t) => t.image)

test("preproc directives may only be preceded by whitespace", () => {
  expect(() => preproc("int i; #define AA 2")).toThrow(
    "preproc directives may only be preceded by whitespace",
  )
})
test("macro name starting with GL_ is not allowed", () => {
  expect(() => preproc("#define GL_TEST")).toThrow(
    "macro name starting with GL_ is not allowed",
  )
})
test("cannot redefine built-in macro", () => {
  expect(() => preproc("#define __LINE__ 2")).toThrow(
    "cannot redefine built-in macro",
  )
})
test("cannot undefine built-in macro", () => {
  expect(() => preproc("#undef __LINE__ 2")).toThrow(
    "cannot undefine built-in macro",
  )
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

test("#if macro", () => {
  const source = `
  #define HW_PERFORMANCE 0 
  #if HW_PERFORMANCE==0
  float f;
  #endif
  `
  expect(images(preproc(source))).toEqual(images(lex(`float f;`)))
})
test("#if-#else macro", () => {
  const source = `
  #define HW_PERFORMANCE 0
  #if HW_PERFORMANCE==1
  float f;
  #else
  float b;
  #endif
  `
  expect(images(preproc(source))).toEqual(images(lex(`float b;`)))
})
test("#if-#elsif macro", () => {
  const source = `
  #define HW_PERFORMANCE 0
  #if HW_PERFORMANCE==1
  float f;
  #elsif HW_PERFORMANCE == 0
  float b;
  #else
  int x;
  #endif
  `
  expect(images(preproc(source))).toEqual(images(lex(`float b;`)))
})
test("argument prescan; nested calls", () => {
  // See case 1 https://gcc.gnu.org/onlinedocs/cpp/Argument-Prescan.html#Argument-Prescan
  const source = `
  #define f(x) (x + 1)
  f(f(1))`
  expect(images(preproc(source))).toEqual(images(lex(`((1 + 1) + 1)`)))
})
test("argument prescan; unshielded commas", () => {
  // See case 3 https://gcc.gnu.org/onlinedocs/cpp/Argument-Prescan.html#Argument-Prescan
  const source = `
    #define foo  a,b
    #define bar(x) lose(x)
    #define lose(x) (1 + (x))
    bar(foo)`
  throw new Error("expect error")
  expect(images(preproc(source))).toEqual(images(lex(`(1 + (foo))`)))
})
test("self-referential macro is not replaced infinitely", () => {
  // See https://gcc.gnu.org/onlinedocs/cpp/Self-Referential-Macros.html#Self-Referential-Macros
  const source = `#define foo (4 + foo)
    foo`
  expect(images(preproc(source))).toEqual(images(lex(`(4 + foo)`)))
})
test("indirect self-referential macro is not replaced infinitely", () => {
  const source = `#define x (4 + y)
    #define y (2 * x)
    x
    y`
  expect(images(preproc(source))).toEqual(
    images(lex(`(4 + (2 * x)) (2 * (4 + y))`)),
  )
})
test("example from c++ standard", () => {
  // adapted from https://eel.is/c++draft/cpp.rescan
  const source = `  
    #define x       3
    #define f(a)    f(x * (a))
    #undef  x
    #define x       2
    #define g       f
    #define z       z[0]
    #define h       g(~
    #define m(a)    a(w)
    #define w       0,1
    #define t(a)    a
    #define p()     int
    #define q(x)    x
    #define r(x,y)  x , y
    
    f(y+1) + f(f(z)) % t(t(g)(0) + t)(1);
    g(x+(3,4)-w) | h 5) & m
    (f)^m(m);
    p() i[q()] = { q(1), r(2,3), r(4,), r(,5), r(,) };
  `
  const output = `
    f(2 * (y+1)) + f(2 * (f(2 * (z[0])))) % f(2 * (0)) + t(1);
    f(2 * (2+(3,4)-0,1)) | f(2 * (~ 5)) & f(2 * (0,1))^m(0,1);
    int i[] = { 1, 2, 3, 4, 5, };
  `
  //expect(images(preproc(source))).toEqual(images(lex(output)))
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
