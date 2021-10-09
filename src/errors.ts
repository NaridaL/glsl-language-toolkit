//SPEC// 10 Errors
/*This section lists errors that must be detected by the compiler or linker.  Development systems  must
report all grammatical errors are compile time but otherwise, it is implementation-dependent whether an
error is reported at compile time or link time and there is no guarantee of consistency.
    The error string returned is implementation-dependent.*/
export const ERRORS: Record<string, string> = {
  //SPEC// 10.1 Preprocessor Errors
  P0001: "Preprocessor syntax error",
  P0002: "#error",
  P0003:
    "#extension if a required extension extension_name is not supported, or if all is specified.",
  P0005: "Invalid #version construct",
  P0006: "#line has wrong parameters",
  P0007: "Language version not supported",
  P0008: "Use of undefined macro",
  P0009: "Macro name too long",
  //SPEC// 10.2 Lexer/Parser Errors
  //SPEC// Grammatical errors occurs whenever the grammar rules are not followed.  They are not listed individually here.
  G0001: "Syntax error",
  //SPEC// The parser also detects the following errors:
  G0002: "Undefined identifier.",
  G0003: "Use of reserved keywords",
  G0004: "Identifier too long",
  G0005: "Integer constant too long",
  //SPEC// 10.3 Semantic Errors
  S0001: "Type mismatch in expression e.g. 1 + 1.0",
  S0002: "Array parameter must be an integer",
  S0003:
    "Conditional jump parameter (if, for, while, do-while) must be a boolean",
  S0004: "Operator not supported for operand types (e.g. mat4 * vec3)",
  S0005: "?: parameter must be a boolean",
  S0006: "2nd and 3rd parameters of ?: must have the same type",
  S0007: "Wrong arguments for constructor",
  S0008: "Argument unused in constructor",
  S0009: "Too few arguments for constructor",
  S0011: "Arguments in wrong order for structure constructor",
  S0012: "Expression must be a constant expression",
  S0013: "Initializer for constant variable must be a constant expression",
  S0015: "Expression must be a constant integral expression",
  S0017: "Array size must be greater than zero",
  S0018: "Array size not defined",
  S0020:
    "Indexing an array with a constant integral expression greater than its declared size",
  S0021: "Indexing an array with a negative constant integral expression",
  S0022: "Redefinition of variable in same scope",
  S0023: "Redefinition of function in same scope",
  S0024:
    "Redefinition of name in same scope (e.g. declaring a function with the same name as a struct)",
  S0025:
    "Field selectors must be from the same set (cannot mix xyzw with rgba)",
  S0026: "Illegal field selector (e.g. using .z with a vec2)",
  S0027: "Target of assignment is not an l-value",
  S0028: "Precision used with type other than int, float or sampler type",
  S0029: "Declaring a main function with the wrong signature or return type",
  S0031: "const variable does not have initializer",
  S0032:
    "Use of float or int without a precision qualifier where the default precision is not defined",
  S0033:
    "Expression that does not have an intrinsic precision where the default precision is not defined",
  S0034: "Variable cannot be declared invariant",
  S0035: "All uses of invariant must be at the global scope",
  S0037: "L-value contains duplicate components (e.g. v.xx = q;)",
  S0038:
    "Function declared with a return value but return statement has no argument",
  S0039: "Function declared void but return statement has an argument",
  S0040:
    "Function declared with a return value but not all paths return a value",
  S0042:
    "Return type of function definition must match return type of function declaration.",
  S0043:
    "Parameter qualifiers of function definition must match parameter qualifiers of function declaration.",

  S0045: "Declaring an input inside a function",
  S0046: "Declaring a uniform inside a function",
  S0047: "Declaring an output inside a function",
  S0048: "Illegal data type for vertex output or fragment input",
  S0049:
    "Illegal data type for vertex input (can only use float, floating-point vectors, matrices, signed and unsigned integers and integer vectors)",

  S0050: "Initializer for input",
  S0051: "Initializer for output",
  S0052: "Initializer for uniform",
  S0053: "Static recursion present",
  S0054: "Overloading built-in functions not allowed.",
  S0055: "Vertex output with integral type must be declared as flat",
  S0056: "Fragment input with integral type must be declared as flat",
  S0057: "init-expression in switch statement must be a scalar integer",
  S0058: "Illegal data type for fragment output",
  S0059: "Invalid layout qualifier",
  S0060:
    "Invalid use of layout qualifier (e.g. on vertex shader outputs or fragment shader inputs)",
  //SPEC// 10.4 Linker
  L0001:
    "Global variables must have the same type (including the same names for structure and field names and the same size for arrays) and precision.",

  L0003: "Too many vertex input values",
  L0004: "Too many vertex output values",
  L0005: "Too many uniform values",
  L0006: "Too many fragment output values",
  L0007:
    "Fragment shader uses an input where there is no corresponding vertex output",
  L0008: "Type mismatch between vertex output and fragment input",
  L0009: "Missing main function for shader",

  C0001: "struct specifier cannot be parameter type",
}
