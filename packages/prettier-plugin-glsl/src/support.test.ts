import expect from "expect"
import { parseInput, shortDesc2 } from "./parser"
import { dedent, getMarkerPositions } from "./testutil"
import { offsetToLineCol } from "./util"
import { check } from "./checker"
import { getColors, resolvePositionDefinition } from "./support"

function testFindDeclaration(sourceWithMarkers: string) {
  const [source, markers] = getMarkerPositions(sourceWithMarkers)
  const tree = parseInput(source)
  check(tree, undefined)
  const definitionToken = resolvePositionDefinition(
    tree,
    ...offsetToLineCol(source, markers[1].start),
  )

  expect(definitionToken!.startOffset).toEqual(markers[0].start)
}

describe("definition lookup", () => {
  test("find parameter declaration", () => {
    testFindDeclaration(dedent`
      void foo(int 'a') {
        int b = 'a' + 2;
      }`)
  })
  test("find variable declaration", () => {
    testFindDeclaration(dedent`
      void foo() {
        int k = 0, 'a' = 32;
        int b = 'a' + 2;
      }`)
  })
  test("find function declaration", () => {
    testFindDeclaration(dedent`
      void foo();
      void 'foo'(int a) {}
      void main() {
        'foo'(2);
      } 
    `)
  })
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
