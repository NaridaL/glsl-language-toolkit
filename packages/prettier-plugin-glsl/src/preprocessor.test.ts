import "./index"
import expect from "expect"
import { applyLineContinuations, preproc } from "./preprocessor"
import { Token } from "./nodes"
import { lex } from "./lexer"

const images = (toks: Token[]) => toks.map((t) => t.image)

function testPreproc(source: string, expected: string): void {
  const img = images(preproc(source))
  console.log(img.join(" "))
  expect(img).toEqual(images(lex(expected)))
}

test("preproc directives may only be preceded by whitespace", () => {
  expect(() => preproc("int i; #define AA 2")).toThrow(
    "preprocessor directives may only be preceded by whitespace",
  )
})
test("preproc directives may preceded by comment", () => {
  testPreproc("/* int i; */ #define AA 2", "")
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
test("cannot use undefined macro in pp-constant-expression", () => {
  expect(() =>
    preproc(`#if FOO
  #endif`),
  ).toThrow("undefined identifier")
})

test("pp-constant-expressions", () => {
  testPreproc(
    `#if ( ~ - + ! 3 != 32 ) || NOT_DEFINED
    x
    #endif`,
    "x",
  )
})

test("object macro", () => {
  const source = `
  #define X vec3(1.)
  
  vec3 v = X;
  `
  testPreproc(source, `vec3 v = vec3(1.);`)
})

describe("function macros", () => {
  test("0 params, 0 args is valid", () => {
    testPreproc(
      `
          #define FOO() BAR()
          FOO()`,
      `BAR()`,
    )
  })
  test("0 params, 1 arg is invalid", () => {
    expect(() =>
      preproc(`#define FOO() x
        FOO(a)`),
    ).toThrow("incorrect number of arguments, expected 0, was 1")
  })
  test("1 param, 1 arg is valid", () => {
    const source = `
      #define V(X) vec3(X)
      
      vec3 v = V(1);`
    testPreproc(source, `vec3 v = vec3(1);`)
  })
  test("1 param, 0 args is valid (empty token list)", () => {
    testPreproc(
      `
      #define V(X) vec3(X)
      vec3 v = V();
    `,
      `vec3 v = vec3();`,
    )
  })
  test("1 param, 2 args is invalid", () => {
    expect(() =>
      preproc(`
        #define FOO(x) x
        FOO(a,b)`),
    ).toThrow("incorrect number of arguments, expected 1, was 2")
  })
})

describe("built-in macros", () => {
  test("__LINE__", () => {
    const source = `
    #if __LINE__ == 2
    float f = __LINE__;
    #endif`
    testPreproc(source, `float f = 3;`)
  })
  test("GL_ES", () => {
    testPreproc("GL_ES", `1`)
  })
  test("__VERSION__", () => {
    testPreproc("__VERSION__", `300`)
  })
})

test("#if macro", () => {
  const source = `
  #define HW_PERFORMANCE 0 
  #if HW_PERFORMANCE==0
  float f;
  #endif
  `
  testPreproc(source, `float f;`)
})
test("#define in false #if", () => {
  testPreproc(
    `#if 0 == 1
    #define FOO 2
    #endif
    FOO`,
    "FOO",
  )
})
test("#if-#else macro", () => {
  const source = `
  #define HW_PERFORMANCE 0
  #if HW_PERFORMANCE==1
  float f;
  #else
  #define bar
  float b;
  #endif
  `
  testPreproc(source, `float b;`)
})
test("#if-#elif macro", () => {
  const source = `
  #define HW_PERFORMANCE 0
  #if HW_PERFORMANCE==1
  float f;
  #elif HW_PERFORMANCE == 0
  float b;
  #else
  int x;
  #endif
  `
  testPreproc(source, `float b;`)
})
test("#ifdef macro", () => {
  testPreproc(
    `#ifdef FOO
      a
      #else
      b
      #endif`,
    "b",
  )
})
test("argument prescan; nested calls", () => {
  // See case 1 https://gcc.gnu.org/onlinedocs/cpp/Argument-Prescan.html#Argument-Prescan
  const source = `
  #define f(x) (x + 1)
  f(f(1))`
  testPreproc(source, `((1 + 1) + 1)`)
})
test("argument prescan; unshielded commas", () => {
  // See case 3 https://gcc.gnu.org/onlinedocs/cpp/Argument-Prescan.html#Argument-Prescan
  const source = `
    #define foo  a,b
    #define bar(x) lose(x)
    #define lose(x) (1 + (x))
    bar(foo)`
  expect(() => preproc(source)).toThrow(
    "incorrect number of arguments, expected 1, was 2",
  )
})
test("self-referential macro is not replaced infinitely", () => {
  // See https://gcc.gnu.org/onlinedocs/cpp/Self-Referential-Macros.html#Self-Referential-Macros
  const source = `#define foo (4 + foo)
    foo`
  testPreproc(source, `(4 + foo)`)
})
test("self-referential macro is not replaced infinitely 2", () => {
  // See https://gcc.gnu.org/onlinedocs/cpp/Self-Referential-Macros.html#Self-Referential-Macros
  const source = `#define foo (4 + foo)
    #define bar foo
    bar`
  const expected = `(4 + foo)`
  testPreproc(source, expected)
})
test("self-referential macro is not replaced infinitely as macro param", () => {
  // See https://gcc.gnu.org/onlinedocs/cpp/Self-Referential-Macros.html#Self-Referential-Macros
  const source = `#define foo (4 + foo)
    #define bar(x) x
    bar(foo)`
  const expected = `(4 + foo)`
  testPreproc(source, expected)
})
test("indirect self-referential macro is not replaced infinitely", () => {
  const source = `#define x (4 + y)
    #define y (2 * x)
    x
    y`
  testPreproc(source, `(4 + (2 * x)) (2 * (4 + y))`)
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
    int i[] = { 1, 2, 3, 4, , , 5, , };
  `
  testPreproc(source, output)
})

test("preproc works", () => {
  ;`
  #define f(x) g(f(2), 
  #define g(a, b) a 
  f(2) 3)
  `
  testPreproc(
    `#version 300 es
    #define MAX3(genType) genType max3(genType a, genType b, genType c) {\\
    return max(a, max(b, c));\\
    }
    
    MAX3(float)
    MAX3(vec3)
    
    #pragma glslify: export(max3)`,
    `
      float max3(float a, float b, float c) {
        return max(a, max(b, c));
      }
      vec3 max3(vec3 a, vec3 b, vec3 c) {
        return max(a, max(b, c)); 
      }
     `,
  )
})
test("directives may have whitespace everywhere", () => {
  // "\x20" is just a simple space, encoded here so editors don't remove it.
  const source = `  #  version    300   es\x20\x20   
    #  define G 1
    # ifdef G
    float f;
    #\\
en\\
dif`
  testPreproc(source, `float f;`)
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
