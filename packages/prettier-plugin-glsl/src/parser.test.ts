import expect from "expect"
import { parseInput, shortDesc2 } from "./parser"
import { simplifyCst } from "./gendiagrams"
import { dedent } from "./testutil"
import { findPositionNode } from "./nodes"

test("parse multi-dim array", () => {
  expect(
    simplifyCst(parseInput(`void foo() { float[2] ff = float[2](1., 2.); }`)),
  ).toStrictEqual({
    comments: [],
    declarations: [
      {
        body: {
          firstToken: "LEFT_BRACE({) 11-11",
          kind: "compoundStatement",
          lastToken: "RIGHT_BRACE(}) 45-45",
          newScope: false,
          statements: [
            {
              declarators: [
                {
                  arraySpecifier: undefined,

                  firstToken: "NON_PP_IDENTIFIER(ff) 22-23",
                  init: {
                    args: [
                      {
                        const_: "FLOATCONSTANT(1.) 36-37",

                        firstToken: "FLOATCONSTANT(1.) 36-37",
                        kind: "constantExpression",
                        lastToken: "FLOATCONSTANT(1.) 36-37",
                      },
                      {
                        const_: "FLOATCONSTANT(2.) 40-41",

                        firstToken: "FLOATCONSTANT(2.) 40-41",
                        kind: "constantExpression",
                        lastToken: "FLOATCONSTANT(2.) 40-41",
                      },
                    ],
                    callee: {
                      arraySpecifier: {
                        firstToken: "LEFT_BRACKET([) 32-32",
                        kind: "arraySpecifier",
                        lastToken: "RIGHT_BRACKET(]) 34-34",
                        size: {
                          const_: "INTCONSTANT(2) 33-33",

                          firstToken: "INTCONSTANT(2) 33-33",
                          kind: "constantExpression",
                          lastToken: "INTCONSTANT(2) 33-33",
                        },
                      },

                      firstToken: "FLOAT(float) 27-31",
                      kind: "typeSpecifier",
                      lastToken: "RIGHT_BRACKET(]) 34-34",
                      precisionQualifier: undefined,
                      typeSpecifierNonArray: "FLOAT(float) 27-31",
                    },

                    firstToken: "FLOAT(float) 27-31",
                    kind: "functionCall",
                    lastToken: "RIGHT_PAREN()) 42-42",
                  },
                  kind: "declarator",
                  lastToken: "RIGHT_PAREN()) 42-42",
                  name: "NON_PP_IDENTIFIER(ff) 22-23",
                },
              ],
              firstToken: "FLOAT(float) 13-17",
              fsType: {
                firstToken: "FLOAT(float) 13-17",
                kind: "fullySpecifiedType",
                lastToken: "RIGHT_BRACKET(]) 20-20",
                typeQualifier: undefined,
                typeSpecifier: {
                  arraySpecifier: {
                    firstToken: "LEFT_BRACKET([) 18-18",
                    kind: "arraySpecifier",
                    lastToken: "RIGHT_BRACKET(]) 20-20",
                    size: {
                      const_: "INTCONSTANT(2) 19-19",

                      firstToken: "INTCONSTANT(2) 19-19",
                      kind: "constantExpression",
                      lastToken: "INTCONSTANT(2) 19-19",
                    },
                  },

                  firstToken: "FLOAT(float) 13-17",
                  kind: "typeSpecifier",
                  lastToken: "RIGHT_BRACKET(]) 20-20",
                  precisionQualifier: undefined,
                  typeSpecifierNonArray: "FLOAT(float) 13-17",
                },
              },
              kind: "initDeclaratorListDeclaration",
              lastToken: "SEMICOLON(;) 43-43",
            },
          ],
        },

        firstToken: "VOID(void) 0-3",
        kind: "functionDefinition",
        lastToken: "RIGHT_BRACE(}) 45-45",
        name: "NON_PP_IDENTIFIER(foo) 5-7",
        params: [],
        returnType: {
          firstToken: "VOID(void) 0-3",
          kind: "fullySpecifiedType",
          lastToken: "VOID(void) 0-3",
          typeQualifier: undefined,
          typeSpecifier: {
            arraySpecifier: undefined,

            firstToken: "VOID(void) 0-3",
            kind: "typeSpecifier",
            lastToken: "VOID(void) 0-3",
            precisionQualifier: undefined,
            typeSpecifierNonArray: "VOID(void) 0-3",
          },
        },
      },
    ],
    firstToken: "VOID(void) 0-3",
    kind: "translationUnit",
    lastToken: "RIGHT_BRACE(}) 45-45",
  })
})

test("calling a variable ifdef works", () => {
  parseInput("float defined = 2.0;")
})

test("parse nested assignments", () => {
  parseInput(dedent`
    void main() {
      // int a, b;
      a = b = 2;
    }`)
})
test("precision declaration", () => {
  parseInput("precision mediump float;")
})
test("findPositionNode", () => {
  const tree = parseInput(dedent`
    void main() {
      if (32 == kawaga) {
        float f = sirup(foo(a, s));
      }
    }
  `)
  const [result, path] = findPositionNode(tree, 3, 22)
  expect(path.map(shortDesc2)).toEqual([
    "translationUnit 1:1-5:2",
    "functionDefinition 1:1-5:2",
    "compoundStatement 1:13-5:2",
    "selectionStatement 2:3-4:4",
    "compoundStatement 2:21-4:4",
    "initDeclaratorListDeclaration 3:5-3:32",
    "declarator 3:11-3:31",
    "functionCall 3:15-3:31",
    "functionCall 3:21-3:30",
    "typeSpecifier 3:21-3:24",
  ])
  expect(shortDesc2(result!)).toEqual("typeSpecifier 3:21-3:24")
})
