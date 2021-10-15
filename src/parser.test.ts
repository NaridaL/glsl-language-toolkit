import { parseInput } from "./parser"
import { simplifyCst } from "./gendiagrams"

test("parse multi-dim array", () => {
  expect(
    simplifyCst(parseInput(`void foo() { float[2] ff = float[2](1., 2.); }`)),
  ).toStrictEqual({
    children: ["functionDefinition 0-45"],
    comments: [],
    declarations: [
      {
        body: {
          children: [
            "initDeclaratorListDeclaration 13-43",
            "initDeclaratorListDeclaration 13-43",
          ],
          firstToken: "LEFT_BRACE({) 11-11",
          kind: "compoundStatement",
          lastToken: "RIGHT_BRACE(}) 45-45",
          newScope: [],
          statements: [
            {
              children: ["fullySpecifiedType 13-20", "declarator 22-42"],
              declarators: [
                {
                  arraySpecifier: {},
                  children: ["typeSpecifier 27-34", "functionCall 27-42"],
                  firstToken: "IDENTIFIER(ff) 22-23",
                  init: {
                    args: [
                      {
                        _const: "FLOATCONSTANT(1.) 36-37",
                        children: [],
                        firstToken: "FLOATCONSTANT(1.) 36-37",
                        kind: "constantExpression",
                        lastToken: "FLOATCONSTANT(1.) 36-37",
                      },
                      {
                        _const: "FLOATCONSTANT(2.) 40-41",
                        children: [],
                        firstToken: "FLOATCONSTANT(2.) 40-41",
                        kind: "constantExpression",
                        lastToken: "FLOATCONSTANT(2.) 40-41",
                      },
                    ],
                    callee: {
                      arraySpecifier: {
                        children: ["constantExpression 33-33"],
                        firstToken: "LEFT_BRACKET([) 32-32",
                        kind: "arraySpecifier",
                        lastToken: "RIGHT_BRACKET(]) 34-34",
                        size: {
                          _const: "INTCONSTANT(2) 33-33",
                          children: [],
                          firstToken: "INTCONSTANT(2) 33-33",
                          kind: "constantExpression",
                          lastToken: "INTCONSTANT(2) 33-33",
                        },
                      },
                      children: ["arraySpecifier 32-34"],
                      firstToken: "FLOAT(float) 27-31",
                      kind: "typeSpecifier",
                      lastToken: "RIGHT_BRACKET(]) 34-34",
                      precisionQualifier: {},
                      typeSpecifierNonArray: "FLOAT(float) 27-31",
                    },
                    children: [
                      "typeSpecifier 27-34",
                      "constantExpression 36-37",
                      "constantExpression 40-41",
                    ],
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
                children: ["typeSpecifier 13-20"],
                firstToken: "FLOAT(float) 13-17",
                kind: "fullySpecifiedType",
                lastToken: "RIGHT_BRACKET(]) 20-20",
                typeQualifier: {},
                typeSpecifier: {
                  arraySpecifier: {
                    children: ["constantExpression 19-19"],
                    firstToken: "LEFT_BRACKET([) 18-18",
                    kind: "arraySpecifier",
                    lastToken: "RIGHT_BRACKET(]) 20-20",
                    size: {
                      _const: "INTCONSTANT(2) 19-19",
                      children: [],
                      firstToken: "INTCONSTANT(2) 19-19",
                      kind: "constantExpression",
                      lastToken: "INTCONSTANT(2) 19-19",
                    },
                  },
                  children: ["arraySpecifier 18-20"],
                  firstToken: "FLOAT(float) 13-17",
                  kind: "typeSpecifier",
                  lastToken: "RIGHT_BRACKET(]) 20-20",
                  precisionQualifier: {},
                  typeSpecifierNonArray: "FLOAT(float) 13-17",
                },
              },
              kind: "initDeclaratorListDeclaration",
              lastToken: "SEMICOLON(;) 43-43",
            },
          ],
        },
        children: ["fullySpecifiedType 0-3", "compoundStatement 11-45"],
        firstToken: "VOID(void) 0-3",
        kind: "functionDefinition",
        lastToken: "RIGHT_BRACE(}) 45-45",
        name: "IDENTIFIER(foo) 5-7",
        params: [],
        returnType: {
          children: ["typeSpecifier 0-3"],
          firstToken: "VOID(void) 0-3",
          kind: "fullySpecifiedType",
          lastToken: "VOID(void) 0-3",
          typeQualifier: {},
          typeSpecifier: {
            arraySpecifier: {},
            children: [],
            firstToken: "VOID(void) 0-3",
            kind: "typeSpecifier",
            lastToken: "VOID(void) 0-3",
            precisionQualifier: {},
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
test("conditional start/end", () => {
  expect(simplifyCst(parseInput(`void f() { a ? b : c = 2; }`))).toStrictEqual({
    children: ["initDeclaratorListDeclaration 0-17"],
    comments: [],
    declarations: [
      {
        children: ["fullySpecifiedType 0-2", "declarator 4-16"],
        declarators: [
          {
            arraySpecifier: {},
            children: ["conditionalExpression 8-16"],
            firstToken: "IDENTIFIER(i) 4-4",
            init: {
              COLON: "COLON(:) 14-14",
              QUESTION: "QUESTION(?) 10-10",
              children: [
                "variableExpression 8-8",
                "variableExpression 12-12",
                "variableExpression 16-16",
              ],
              condition: {
                children: [],
                firstToken: "IDENTIFIER(a) 8-8",
                kind: "variableExpression",
                lastToken: "IDENTIFIER(a) 8-8",
                var: "IDENTIFIER(a) 8-8",
              },
              firstToken: "IDENTIFIER(a) 8-8",
              kind: "conditionalExpression",
              lastToken: "IDENTIFIER(c) 16-16",
              no: {
                children: [],
                firstToken: "IDENTIFIER(c) 16-16",
                kind: "variableExpression",
                lastToken: "IDENTIFIER(c) 16-16",
                var: "IDENTIFIER(c) 16-16",
              },
              yes: {
                children: [],
                firstToken: "IDENTIFIER(b) 12-12",
                kind: "variableExpression",
                lastToken: "IDENTIFIER(b) 12-12",
                var: "IDENTIFIER(b) 12-12",
              },
            },
            kind: "declarator",
            lastToken: "IDENTIFIER(c) 16-16",
            name: "IDENTIFIER(i) 4-4",
          },
        ],
        firstToken: "INT(int) 0-2",
        fsType: {
          children: ["typeSpecifier 0-2"],
          firstToken: "INT(int) 0-2",
          kind: "fullySpecifiedType",
          lastToken: "INT(int) 0-2",
          typeQualifier: {},
          typeSpecifier: {
            arraySpecifier: {},
            children: [],
            firstToken: "INT(int) 0-2",
            kind: "typeSpecifier",
            lastToken: "INT(int) 0-2",
            precisionQualifier: {},
            typeSpecifierNonArray: "INT(int) 0-2",
          },
        },
        kind: "initDeclaratorListDeclaration",
        lastToken: "SEMICOLON(;) 17-17",
      },
    ],
    firstToken: "INT(int) 0-2",
    kind: "translationUnit",
    lastToken: "SEMICOLON(;) 17-17",
  })
})
