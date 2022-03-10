import { nth } from "lodash"
import {
  AbstractVisitor,
  findPositionNode,
  FunctionCall,
  Node,
  Token,
} from "./nodes"
import { shortDesc2 } from "./parser"
import { TOKEN } from "./lexer"
import { evaluateConstantExpression } from "./checker"

export function resolveNodeDefinition(node: Node): Token | undefined {
  if (node.kind === "functionCall") {
    if (node.binding) {
      return node.binding.overloads?.[0].def.name
    }
  } else if (node.kind === "variableExpression") {
    if (node.binding?.parameter) {
      return node.binding.parameter.pName
    } else if (node.binding?.declarator) {
      return node.binding.declarator.name
    }
  } else if (node.kind === "typeSpecifier") {
    if (node.typeSpecifierNonArrayBinding) {
      return node.typeSpecifierNonArrayBinding.type.specifier.name
    }
  } else if (node.kind === "fieldAccess") {
    if (node.on.resolvedType?.kind === "struct") {
      return node.on.resolvedType.fields[node.field.image]?.declarator?.name
    }
  }
}

export function resolvePositionDefinition(
  tree: Node,
  line: number,
  column: number,
): Token | undefined {
  const [node, path] = findPositionNode(tree, line, column)
  if (node) {
    console.log("foundNode", shortDesc2(node))
    const result = resolveNodeDefinition(node)
    if (result) {
      return result
    }
  }
  if (
    nth(path, -1)?.kind === "typeSpecifier" &&
    nth(path, -2)?.kind === "functionCall"
  ) {
    return resolveNodeDefinition(nth(path, -2)!)
  }
}

export function getHighlights(
  tree: Node,
  line: number,
  column: number,
): Node[] {
  const [node, path] = findPositionNode(tree, line, column)

  return []
}

const COLOR_VISITOR = new (class extends AbstractVisitor<void> {
  private result!: {
    node: FunctionCall
    color: [number, number, number, number?]
  }[]

  public getColors(tree: Node) {
    this.result = []
    this.visit(tree)
    return this.result
  }

  protected functionCall(n: FunctionCall): void | undefined {
    if (
      n.constructorType?.kind === "basic" &&
      (n.constructorType.type === TOKEN.VEC3 ||
        n.constructorType.type === TOKEN.VEC4)
    ) {
      const color: number[] = []
      if (
        n.args.every((arg) => {
          if (arg.kind === "constantExpression") {
            const val = evaluateConstantExpression(arg)!.value
            if (val >= 0 && val <= 1) {
              color.push(val)
              return true
            }
          }
          return false
        })
      ) {
        this.result.push({ node: n, color: color as any })
        return
      }
    }
    return super.functionCall(n)
  }
})()

export function getColors(tree: Node) {
  return COLOR_VISITOR.getColors(tree)
}
