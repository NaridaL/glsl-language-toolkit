import { dedent } from "./util"
import { getMarkerPositions } from "./testutil.test"
import { findPositionNode } from "./nodes"
import { parseInput } from "./parser"

function testFindDeclaration(sourceWithMarkers: string) {
  const [source, markers] = getMarkerPositions(sourceWithMarkers)
  const tree = parseInput(source)
  findPositionNode(tree)
  throw new Error("Function not implemented.")
}

describe("definition lookup", () => {
  test("find d", () => {
    testFindDeclaration(dedent`
      void foo(int 'a') {
        int b = 'a' + 2;
      }`)
  })
})
