void main() {
    //SPEC// variableIdentifier:
    //SPEC//     IDENTIFIER
    //SPEC// primaryExpression:
    //SPEC//     variableIdentifier
    //SPEC//     INTCONSTANT
    //SPEC//     UINTCONSTANT
    //SPEC//     FLOATCONSTANT
    //SPEC//     BOOLCONSTANT
    //SPEC//     LEFT_PAREN expression RIGHT_PAREN
    foo;
    10;
    //    12u;
    //    .3e23;
    (foo);
    //SPEC// postfixExpression:
    //SPEC//     primaryExpression
    //SPEC//     postfixExpression LEFT_BRACKET integerExpression RIGHT_BRACKET
    //SPEC//     functionCall
    //SPEC//     postfixExpression DOT FIELD_SELECTION
    //SPEC//     postfixExpression INC_OP
    //SPEC//     postfixExpression DEC_OP
    foo[3];
    zot.xyz;
    foo[3].xyz;
    foo.xyz[3]++;
    foo.xyz[3]--;
    //SPEC// integerExpression:
    //SPEC//     expression
    //SPEC// functionCall:
    //SPEC//     functionCallOrMethod
    //SPEC// functionCallOrMethod:
    //SPEC//     functionCallGeneric
    //SPEC//     postfixExpression DOT functionCallGeneric
    foo.bar();
    //SPEC// functionCallGeneric:
    //SPEC//     functionCallHeaderWithParameters RIGHT_PAREN
    //SPEC//     functionCallHeaderNoParameters RIGHT_PAREN
    //SPEC// functionCallHeaderNoParameters:
    //SPEC//     functionCallHeader VOID
    //SPEC//     functionCallHeader
    //SPEC// functionCallHeaderWithParameters:
    //SPEC//     functionCallHeader assignmentExpression
    //SPEC//     functionCallHeaderWithParameters COMMA assignmentExpression
    //SPEC// functionCallHeader:
    //SPEC//     functionIdentifier LEFT_PAREN
    //SPEC//     // GramNote: Constructors look like functions, but lexical analysis recognized most of them as
    //SPEC//     // keywords.  They are now recognized through “typeSpecifier”.
    //SPEC//     // Methods (.length) and identifiers are recognized through postfixExpression.
    //SPEC// functionIdentifier:
    //SPEC//     typeSpecifier
    //SPEC//     IDENTIFIER
    //SPEC//     FIELD_SELECTION
    vec3(x = 1.);
    foo(2., (zot));
    foo(void);
    foo();

    //SPEC// unaryExpression:
    //SPEC//     postfixExpression
    //SPEC//     INC_OP unaryExpression
    //SPEC//     DEC_OP unaryExpression
    //SPEC//     unaryOperator unaryExpression
    //SPEC//     // GramNote:  No traditional style type casts.
    ++a;
    --b;
    //SPEC// unaryOperator:
    //SPEC//     PLUS
    //SPEC//     DASH
    //SPEC//     BANG
    //SPEC//     TILDE
    //SPEC//     // GramNote:  No '*' or '&' unary ops.  Pointers are not supported.
    +a;
    -b;
    !c;
    ~d;
    //SPEC// multiplicativeExpression:
    //SPEC//     unaryExpression
    //SPEC//     multiplicativeExpression STAR unaryExpression
    //SPEC//     multiplicativeExpression SLASH unaryExpression
    //SPEC//     multiplicativeExpression PERCENT unaryExpression
    a * b;
    1. / +c;
    ~x % 2 * z;
    //SPEC// additiveExpression:
    //SPEC//     multiplicativeExpression
    //SPEC//     additiveExpression PLUS multiplicativeExpression
    //SPEC//     additiveExpression DASH multiplicativeExpression
    a + b;
    a * b - c * d + 2.;
    //SPEC// shiftExpression:
    //SPEC//     additiveExpression
    //SPEC//     shiftExpression LEFT_OP additiveExpression
    //SPEC//     shiftExpression RIGHT_OP additiveExpression
    x << 2;
    x >> 3 >> a + b;
    //SPEC// relationalExpression:
    //SPEC//     shiftExpression
    //SPEC//     relationalExpression LEFT_ANGLE shiftExpression
    //SPEC//     relationalExpression RIGHT_ANGLE shiftExpression
    //SPEC//     relationalExpression LE_OP shiftExpression
    //SPEC//     relationalExpression GE_OP shiftExpression
    a < b;
    x >> 3 > c;
    x >> y <= c >= d;
    //SPEC// equalityExpression:
    //SPEC//     relationalExpression
    //SPEC//     equalityExpression EQ_OP relationalExpression
    //SPEC//     equalityExpression NE_OP relationalExpression
    a == b;
    c == d != a > b;
    //SPEC// andExpression:
    //SPEC//     equalityExpression
    //SPEC//     andExpression AMPERSAND equalityExpression
    a & c == d;
    //SPEC// exclusiveOrExpression:
    //SPEC//     andExpression
    //SPEC//     exclusiveOrExpression CARET andExpression
    a & b ^ c;
    //SPEC// inclusiveOrExpression:
    //SPEC//     exclusiveOrExpression
    //SPEC//     inclusiveOrExpression VERTICALBAR exclusiveOrExpression
    a | b & c;
    //SPEC// logicalAndExpression:
    //SPEC//     inclusiveOrExpression
    //SPEC//     logicalAndExpression AND_OP inclusiveOrExpression
    a && b | c;
    //SPEC// logicalXorExpression:
    //SPEC//     logicalAndExpression
    //SPEC//     logicalXorExpression XOR_OP logicalAndExpression
    a && b ^^ c;
    //SPEC// logicalOrExpression:
    //SPEC//     logicalXorExpression
    //SPEC//     logicalOrExpression OR_OP logicalXorExpression
    a ^^ x || b;
    //SPEC// conditionalExpression:
    //SPEC//     logicalOrExpression
    //SPEC//     logicalOrExpression QUESTION expression COLON assignmentExpression
    a ? b : c;
    a || b ? foo[2] : x = b;
    //SPEC// assignmentExpression:
    //SPEC//     conditionalExpression
    //SPEC//     unaryExpression assignmentOperator assignmentExpression
    foo[2] *= x /= 2;
    //SPEC// assignmentOperator:
    //SPEC//     EQUAL
    //SPEC//     MULASSIGN
    //SPEC//     DIVASSIGN
    //SPEC//     MODASSIGN
    //SPEC//     ADDASSIGN
    //SPEC//     SUBASSIGN
    //SPEC//     LEFTASSIGN
    //SPEC//     RIGHTASSIGN
    //SPEC//     ANDASSIGN
    //SPEC//     XORASSIGN
    //SPEC//     ORASSIGN
    a = b;
    a *= b;
    a /= b;
    a %= b;
    a += b;
    a -= b;
    a <<= b;
    a >>= b;
    a &= b;
    a ^= b;
    a |= b;
    //SPEC// expression:
    //SPEC//     assignmentExpression
    //SPEC//     expression COMMA assignmentExpression
    a = b, a += b;
    //SPEC// constantExpression:
    //SPEC//     conditionalExpression
}
//SPEC// declaration:
//SPEC//     functionPrototype SEMICOLON
//SPEC//     initDeclaratorList SEMICOLON
//SPEC//     PRECISION precisionQualifier typeSpecifierNoPrec SEMICOLON
//SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE SEMICOLON
//SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER SEMICOLON
//SPEC//     typeQualifier IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE IDENTIFIER LEFT_BRACKET
//SPEC//     constantExpression RIGHT_BRACKET SEMICOLON
//SPEC//     typeQualifier SEMICOLON
void prot();
//SPEC// functionPrototype:
//SPEC//     functionDeclarator RIGHT_PAREN
//SPEC// functionDeclarator:
//SPEC//     functionHeader
//SPEC//     functionHeaderWithParameters
//SPEC// functionHeaderWithParameters:
//SPEC//     functionHeader parameterDeclaration
//SPEC//     functionHeaderWithParameters COMMA parameterDeclaration
//SPEC// functionHeader:
//SPEC//     fullySpecifiedType IDENTIFIER LEFT_PAREN
//SPEC// parameterDeclarator:
//SPEC//     typeSpecifier IDENTIFIER
//SPEC//     typeSpecifier IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
//SPEC// parameterDeclaration:
//SPEC//     parameterTypeQualifier parameterQualifier parameterDeclarator
//SPEC//     parameterQualifier parameterDeclarator
//SPEC//     parameterTypeQualifier parameterQualifier parameterTypeSpecifier
//SPEC//     parameterQualifier parameterTypeSpecifier
//SPEC// parameterQualifier:
//SPEC//     /* empty */
//SPEC//     IN
//SPEC//     OUT
//SPEC//     INOUT
//SPEC// parameterTypeSpecifier:
//SPEC//     typeSpecifier
//SPEC// initDeclaratorList:
//SPEC//     singleDeclaration
//SPEC//     initDeclaratorList COMMA IDENTIFIER
//SPEC//     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
//SPEC//     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
//SPEC//     initDeclaratorList COMMA IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET EQUAL initializer
//SPEC//     initDeclaratorList COMMA IDENTIFIER EQUAL initializer
invariant a, b, c[2] = 3;
//SPEC// singleDeclaration:
//SPEC//     fullySpecifiedType
//SPEC//     fullySpecifiedType IDENTIFIER
//SPEC//     fullySpecifiedType IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
//SPEC//     fullySpecifiedType IDENTIFIER LEFT_BRACKET RIGHT_BRACKET EQUAL initializer
//SPEC//     fullySpecifiedType IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET EQUAL initializer
//SPEC//     fullySpecifiedType IDENTIFIER EQUAL initializer
//SPEC//     INVARIANT IDENTIFIER
//SPEC//     // GramNote:  No 'enum', or 'typedef'.
int;
int a;
int a[3];
int a[] = int[2](1, 2);
int a[2] = int[2](1, 2);
int a = 2;
invariant a;
//SPEC// fullySpecifiedType:
//SPEC//     typeSpecifier
//SPEC//     typeQualifier typeSpecifier
//SPEC// invariantQualifier:
//SPEC//     INVARIANT
//SPEC// interpolationQualifier:
//SPEC//     SMOOTH
//SPEC//     FLAT
//SPEC// layoutQualifier:
//SPEC//     LAYOUT LEFT_PAREN layoutQualifierIdList RIGHT_PAREN
//SPEC// layoutQualifierIdList:
//SPEC//     layoutQualifierId
//SPEC//     layoutQualifierIdList COMMA layoutQualifierId
//SPEC// layoutQualifierId:
//SPEC//     IDENTIFIER
//SPEC//     IDENTIFIER EQUAL INTCONSTANT
//SPEC//     IDENTIFIER EQUAL UINTCONSTANT
//SPEC// parameterTypeQualifier:
//SPEC//     CONST
//SPEC// typeQualifier:
//SPEC//     storageQualifier
//SPEC//     layoutQualifier
//SPEC//     layoutQualifier storageQualifier
//SPEC//     interpolationQualifier
//SPEC//     interpolationQualifier storageQualifier
//SPEC//     invariantQualifier storageQualifier
//SPEC//     invariantQualifier interpolationQualifier storageQualifier
//SPEC// storageQualifier:
//SPEC//     CONST
//SPEC//     IN
//SPEC//     OUT
//SPEC//     CENTROID IN
//SPEC//     CENTROID OUT
//SPEC//     UNIFORM
//SPEC// typeSpecifier:
//SPEC//     typeSpecifierNoPrec
//SPEC//     precisionQualifier typeSpecifierNoPrec
//SPEC// typeSpecifierNoPrec:
//SPEC//     typeSpecifierNonarray
//SPEC//     typeSpecifierNonarray LEFT_BRACKET RIGHT_BRACKET
//SPEC//     typeSpecifierNonarray LEFT_BRACKET constantExpression RIGHT_BRACKET
//SPEC// typeSpecifierNonarray:
//SPEC//     VOID
//SPEC//     FLOAT
//SPEC//     INT
//SPEC//     UINT
//SPEC//     BOOL
//SPEC//     VEC2
//SPEC//     VEC3
//SPEC//     VEC4
//SPEC//     BVEC2
//SPEC//     BVEC3
//SPEC//     BVEC4
//SPEC//     IVEC2
//SPEC//     IVEC3
//SPEC//     IVEC4
//SPEC//     UVEC2
//SPEC//     UVEC3
//SPEC//     UVEC4
//SPEC//     MAT2
//SPEC//     MAT3
//SPEC//     MAT4
//SPEC//     MAT2X2
//SPEC//     MAT2X3
//SPEC//     MAT2X4
//SPEC//     MAT3X2
//SPEC//     MAT3X3
//SPEC//     MAT3X4
//SPEC//     MAT4X2
//SPEC//     MAT4X3
//SPEC//     MAT4X4
//SPEC//     SAMPLER2D
//SPEC//     SAMPLER3D
//SPEC//     SAMPLERCUBE
//SPEC//     SAMPLER2DSHADOW
//SPEC//     SAMPLERCUBESHADOW
//SPEC//     SAMPLER2DARRAY
//SPEC//     SAMPLER2DARRAYSHADOW
//SPEC//     ISAMPLER2D
//SPEC//     ISAMPLER3D
//SPEC//     ISAMPLERCUBE
//SPEC//     ISAMPLER2DARRAY
//SPEC//     USAMPLER2D
//SPEC//     USAMPLER3D
//SPEC//     USAMPLERCUBE
//SPEC//     USAMPLER2DARRAY
//SPEC//     structSpecifier
//SPEC//     TYPE_NAME
//SPEC// precisionQualifier:
//SPEC//     HIGH_PRECISION
//SPEC//     MEDIUM_PRECISION
//SPEC//     LOW_PRECISION
//SPEC// structSpecifier:
//SPEC//     STRUCT IDENTIFIER LEFT_BRACE structDeclarationList RIGHT_BRACE
//SPEC//     STRUCT LEFT_BRACE structDeclarationList RIGHT_BRACE
//SPEC// structDeclarationList:
//SPEC//     structDeclaration
//SPEC//     structDeclarationList structDeclaration
//SPEC// structDeclaration:
//SPEC//     typeSpecifier structDeclaratorList SEMICOLON
//SPEC//     typeQualifier typeSpecifier structDeclaratorList SEMICOLON
//SPEC// structDeclaratorList:
//SPEC//     structDeclarator
//SPEC//     structDeclaratorList COMMA structDeclarator
//SPEC// structDeclarator:
//SPEC//     IDENTIFIER
//SPEC//     IDENTIFIER LEFT_BRACKET RIGHT_BRACKET
//SPEC//     IDENTIFIER LEFT_BRACKET constantExpression RIGHT_BRACKET
//SPEC// initializer:
//SPEC//     assignmentExpression
//SPEC// declarationStatement:
//SPEC//     declaration
//SPEC// statement:
//SPEC//     compoundStatementWithScope
//SPEC//     simpleStatement
//SPEC// statementNoNewScope:
//SPEC//     compoundStatementNoNewScope
//SPEC//     simpleStatement
//SPEC// statementWithScope:
//SPEC//     compoundStatementNoNewScope
//SPEC//     simpleStatement
//SPEC// // Grammar Note:  labeled statements for SWITCH only; 'goto' is not supported.
//SPEC// simpleStatement:
//SPEC//     declarationStatement
//SPEC//     expressionStatement
//SPEC//     selectionStatement
//SPEC//     switchStatement
//SPEC//     caseLabel
//SPEC//     iterationStatement
//SPEC//     jumpStatement
//SPEC// compoundStatementWithScope:
//SPEC//     LEFT_BRACE RIGHT_BRACE
//SPEC//     LEFT_BRACE statementList RIGHT_BRACE
//SPEC// compoundStatementNoNewScope:
//SPEC//     LEFT_BRACE RIGHT_BRACE
//SPEC//     LEFT_BRACE statementList RIGHT_BRACE
//SPEC// statementList:
//SPEC//     statement
//SPEC//     statementList statement
//SPEC// expressionStatement:
//SPEC//     SEMICOLON
//SPEC//     expression SEMICOLON
//SPEC// selectionStatement:
//SPEC//     IF LEFT_PAREN expression RIGHT_PAREN selectionRestStatement
//SPEC// selectionRestStatement:
//SPEC//     statementWithScope ELSE statementWithScope
//SPEC//     statementWithScope
//SPEC// condition:
//SPEC//     expression
//SPEC//     fullySpecifiedType IDENTIFIER EQUAL initializer
//SPEC// switchStatement:
//SPEC//     SWITCH LEFT_PAREN expression RIGHT_PAREN LEFT_BRACE switchStatementList RIGHT_BRACE
//SPEC// switchStatementList:
//SPEC//     /* nothing */
//SPEC//     statementList
//SPEC// caseLabel:
//SPEC//     CASE expression COLON
//SPEC//     DEFAULT COLON
//SPEC// iterationStatement:
//SPEC//     WHILE LEFT_PAREN condition RIGHT_PAREN statementNoNewScope
//SPEC//     DO statementWithScope WHILE LEFT_PAREN expression RIGHT_PAREN SEMICOLON
//SPEC//     FOR LEFT_PAREN forInitStatement forRestStatement RIGHT_PAREN statementNoNewScope
//SPEC// forInitStatement:
//SPEC//     expressionStatement
//SPEC//     declarationStatement
//SPEC// conditionopt:
//SPEC//     condition
//SPEC//     /* empty */
//SPEC// forRestStatement:
//SPEC//     conditionopt SEMICOLON
//SPEC//     conditionopt SEMICOLON expression
//SPEC// jumpStatement:
//SPEC//     CONTINUE SEMICOLON
//SPEC//     BREAK SEMICOLON
//SPEC//     RETURN SEMICOLON
//SPEC//     RETURN expression SEMICOLON
//SPEC//     DISCARD SEMICOLON   // Fragment shader only.
//SPEC// // Grammar Note:  No 'goto'.  Gotos are not supported.
//SPEC// translationUnit:
//SPEC//     externalDeclaration
//SPEC//     translationUnit externalDeclaration
//SPEC// externalDeclaration:
//SPEC//     functionDefinition
//SPEC//     declaration
//SPEC// functionDefinition:
//SPEC//     functionPrototype compoundStatementNoNewScope