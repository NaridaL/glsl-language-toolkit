#define MUL(A, B) ((A) * (B))

#define ADD(A, B) ((A) + (B))

#define MAX3(genType)                  \
  genType max3(                        \
    genType a,                         \
    genType b,                         \
    genType c                          \
  ) {                                  \
    /* comment here */                 \
    a + b;                             \
    return max(a, max(b, c));          \
  }

MAX3(float)
MAX3(vec3)

// #pragma directive outputs symbols as-is
#pragma glslify: noise = require('glsl-noise/simplex/3d')

#include "fakefile.glsl"

#include <foobar>

// pragma should still be valid identifier
uniform int include;
