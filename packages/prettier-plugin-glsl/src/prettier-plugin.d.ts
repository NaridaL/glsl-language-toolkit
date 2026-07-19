import type { IToken } from "chevrotain"
import type { Plugin, SupportInfo } from "prettier"
import type { AbstractVisitor, Node } from "./nodes"

export declare const CHILDREN_VISITOR: AbstractVisitor<Node[]> & {
  visit(node: Node | undefined): Node[]
}
export declare const languages: SupportInfo["languages"]
export declare const parsers: Plugin<Node | IToken>["parsers"]
export declare const printers: Plugin<Node | IToken>["printers"]
