import type { NormalizedType, FunctionBinding, VariableBinding, StructBinding } from "./checker"
import type { BaseNode, BaseExpressionNode } from "./nodes"

declare module "./nodes" {
  export interface FunctionCall extends BaseNode {
    constructorType?: NormalizedType
    binding?: FunctionBinding
  }

  export interface VariableExpression extends BaseNode {
    binding?: VariableBinding
  }

  export interface FunctionDefinition extends BaseNode {
    returnTypeResolved?: NormalizedType
  }

  export interface FunctionPrototype extends BaseNode {
    returnTypeResolved?: NormalizedType
  }

  export interface TypeSpecifier extends BaseNode {
    typeSpecifierNonArrayBinding?: StructBinding
  }

  export interface BaseExpressionNode {
    resolvedType?: NormalizedType
  }
}
