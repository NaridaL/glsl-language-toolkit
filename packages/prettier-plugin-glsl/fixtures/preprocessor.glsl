#define MUL(A, B) (A) * (B)

#define ADD(A, B) ((A) + (B))

// Single token macro should not be wrapped in parentheses
#define ONE_TOKEN FOO
#define ONE_TOKEN2 32

#define ONE_ARG_MACRO(arg) arg
#define ONE_ARG_MACRO(arg) (arg)

// Braces here need to be kept.
#define TWO_TOKENS (a + b)
// Add braces here to avoid precedence issues
#define TWO_TOKENS2 a + b

#define TERNARY a ? 1 : 2

#define CALL_FUNC_X x(arg1 * (a + b), (arg3))


#define MAX3(genType) \
    genType max3(genType a, genType b, genType c) {\
         /* comment here */\
         a + b;\
         return max(a, max ( b, c ));\
    }


MAX3(float)
MAX3(vec3)

// #pragma directive outputs symbols as-is
#  pragma  glslify: noise = require('glsl-noise/simplex/3d')

#include \
   "fakefile.glsl"

#include \
  <foobar>

// From https://github.com/NaridaL/glsl-language-toolkit/issues/23
#  include <$lib>
#include <../module/sub/file>
#include <@namespace-a>
#include <with spaces >

// This shouldn't be consumed as a preprocessor directive.
int f() {
    int include = 0;
    if (include<2&&include>2) { }
}

// pragma should still be valid identifier
uniform int include;

// From https://github.com/NaridaL/glsl-language-toolkit/issues/27
# extension GL_EXT_frag_depth  : enable
#extension GL_OES_standard_derivatives: enable
#   extension all : \
warn
#extension MY_required_ext:require
#extension MY_very_very_very_very_very_very_very_long_disabled_ext : disable

#ifdef OES_extension_name
#extension OES_extension_name : enable
// code that requires the extension
#else
// alternative code
#endif