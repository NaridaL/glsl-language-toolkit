import { parseInput } from "./parser"
import { simplifyCst } from "./gendiagrams"

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

                  firstToken: "IDENTIFIER(ff) 22-23",
                  init: {
                    args: [
                      {
                        _const: "FLOATCONSTANT(1.) 36-37",

                        firstToken: "FLOATCONSTANT(1.) 36-37",
                        kind: "constantExpression",
                        lastToken: "FLOATCONSTANT(1.) 36-37",
                      },
                      {
                        _const: "FLOATCONSTANT(2.) 40-41",

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
                          _const: "INTCONSTANT(2) 33-33",

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
                  name: "IDENTIFIER(ff) 22-23",
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
                      _const: "INTCONSTANT(2) 19-19",

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
        name: "IDENTIFIER(foo) 5-7",
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
