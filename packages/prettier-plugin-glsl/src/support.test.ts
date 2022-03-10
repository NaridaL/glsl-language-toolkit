import expect from "expect"

import { parseInput, shortDesc2 } from "./parser"
import { dedent, getMarkerPositions } from "./testutil"
import { offsetToLineCol } from "./util"
import { check } from "./checker"
import { getColors, getHighlights, resolvePositionDefinition } from "./support"
import { preproc } from "./preprocessor"

describe("definition lookup", () => {
  function testFindDeclaration(sourceWithMarkers: string) {
    const [source, markers] = getMarkerPositions(sourceWithMarkers)
    expect(markers).toHaveLength(2)
    preproc()
    const tree = parseInput(source)
    check(tree, undefined)
    const definitionToken = resolvePositionDefinition(
      tree,
      ...offsetToLineCol(source, markers[1].start),
    )

    expect(definitionToken).toBeDefined()
    expect(definitionToken!.startOffset).toEqual(markers[0].start)
  }

  test("function parameter", () =>
    testFindDeclaration(dedent`
      void foo(int 'a') {
        int b = 'a' + 2;
      }`))
  test("uniform", () =>
    testFindDeclaration(dedent`
      uniform int 'u' = 2;
      void foo() {
        int k = 'u';
      }`))
  test("local variable", () =>
    testFindDeclaration(dedent`
      void foo() {
        int k = 0, 'a' = 32;
        int b = 'a' + 2;
      }`))
  test("function overload", () =>
    testFindDeclaration(dedent`
      void foo();
      void 'foo'(int a) {}
      void main() {
        'foo'(2);
      }`))
  test("object macro inside code", () =>
    testFindDeclaration(dedent`
      #define 'A' (2 + 3)
      void f() {
        int i = 'A';
      }`))
  test("object macro in #if", () =>
    testFindDeclaration(dedent`
      #define 'A' 2
      #ifdef B
      #elif 'A' == 2
      #endif`))
  test("object macro after redefinition", () =>
    testFindDeclaration(dedent`
      #define A 1
      #define 'A' 2
      int i = 'A';`))
  test("function macro", () =>
    testFindDeclaration(dedent`
      #define 'DOT2(G)' G dot2(G a) { return dot(a, a); }
      'DOT2'(vec2)`))
  test("function defined by macro", () =>
    testFindDeclaration(dedent`
      #define DOT2(G) float dot2(G a) { return dot(a, b); }
      'DOT2(vec2)'
      void main() {
        'dot2'(vec2(2));
      }`))
  test("struct as type", () =>
    testFindDeclaration(dedent`
      struct 'S' { float f; };
      void f('S' s) {}`))
  test("struct as type in array", () =>
    testFindDeclaration(dedent`
      struct 'S' { float f; };
      void f('S'[] s) {}`))
  test("struct as constructor", () =>
    testFindDeclaration(dedent`
      struct 'S' { float f; };
      void f() { S s = 'S'(2.0); }`))
  test("struct field on variable", () =>
    testFindDeclaration(dedent`
      struct S { float 'foo'; };
      void f() { S s; s.'foo'; }`))
  test("struct field on return value", () =>
    testFindDeclaration(dedent`
      struct S { float 'foo'; };
      S[2] s() { S s; return S[](s, s); }
      void f() { s()[1].'foo'; }`))
  test("struct as constructor field type", () =>
    testFindDeclaration(dedent`
      struct 'S' { float foo; };
      struct T { 'S' s; };`))
  test("function parameter inside macro definition", () =>
    testFindDeclaration(dedent`
      #define DOT2(G) G dot2(G 'a') { return dot('a', a); }`))
  test("macro parameter inside macro definition", () =>
    testFindDeclaration(dedent`
      #define DOT2('G') G dot2('G' a) { return dot(a, a); }`))
})

describe("highlight symbol occurrences", () => {
  function testHighlightSymbolOccurrences(sourceWithMarkers: string): void {
    const [source, markers] = getMarkerPositions(sourceWithMarkers)
    expect(markers.length).toBeGreaterThan(0)
    const tree = parseInput(source)
    check(tree, undefined)
    // selecting any symbol should mark all of them
    for (const marker of markers) {
      const highlights = getHighlights(
        tree,
        ...offsetToLineCol(source, marker.start),
      )
      expect(highlights).toEqual(markers)
    }
    return undefined
  }

  test("function parameter", () =>
    testHighlightSymbolOccurrences(dedent`
      void f(int a, float 'foo') {
        float b = 'foo' + 2;
        vec2 v = dot(vec2(2), vec2('foo'));
      }`))

  test("function overload", () =>
    testHighlightSymbolOccurrences(dedent`
      float f() { return 0.0; }
      float 'f'(int a) { return 1.0; }
      void main() {
        float g = f() + 'f'(2);
        f();
        'f'(3);
        int i = 0;
        'f'(i);
      }`))
})

test("getColors", () => {
  const input = dedent`
    const vec3 black = vec3(0, 0, 0);
    void main() {
      vec3[] vs = vec3[](
        vec3(1, 0, 0),
        vec3(34, 23, 22), // larger than 1
        vec3(-.2, .2, .2)); // negative value
      vec4 v_alpha = vec4(.2, .3, .4, .5);
    }
  `

  const tree = parseInput(input)
  check(tree, undefined)
  expect(
    getColors(tree).map(({ node, color }) => [shortDesc2(node), color]),
  ).toEqual([
    ["functionCall 1:20-1:33", [0, 0, 0]],
    ["functionCall 4:5-4:18", [1, 0, 0]],
    ["functionCall 7:18-7:38", [0.2, 0.3, 0.4, 0.5]],
  ])
})
