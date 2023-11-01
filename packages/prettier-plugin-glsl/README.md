[![npm](https://img.shields.io/npm/v/prettier-plugin-glsl?style=flat-square)](https://www.npmjs.com/package/prettier-plugin-glsl)
[![NPM](https://img.shields.io/npm/l/prettier-plugin-glsl?style=flat-square)](https://github.com/NaridaL/glsl-language-toolkit/blob/main/packages/prettier-plugin-glsl/LICENSE)

# prettier-plugin-glsl

This is a plugin for [Prettier](https://prettier.io) (version 3.x), the opinionated code
formatter, for GLSL, the shading language used in WebGL and other places. It
uses a custom parser based on [Chevrotain](https://chevrotain.io/) and does not
require any external dependencies.

**NB: this is still in active development, breaking/formatting changes may be
included in any version.**

## Formatting

This plugin tries to match the formatting rules for JavaScript as closely as
possible. Issues or PRs which make the formatting closer to JavaScript are
welcome.

### Formatting of macros

This plugin will attempt to parse `#define` macros as top-level declarations,
statements or expressions. If successful, these will be formatted as usual.

For example,
`#define MAX3(genType) genType max3(genType a, genType b, genType c) { /* comment */ return max(max(a, b), c); }`
will be formatted as:

<!-- Printed at 60 wide, so it fits on npmjs.com rendered site. -->

```glsl
#define MAX3(genType)                                      \
  genType max3(genType a, genType b, genType c) {          \
    /* comment */                                          \
    return max(max(a, b), c);                              \
  }
```

### Formatting of comments

Comments which start with `/**` will be passed to the markdown formatter.

For an example, see [./builtins.glsl](./builtins.glsl).

## Installation

```sh
npm install --save-dev prettier-plugin-glsl
```

Prettier will automatically pick up the plugin. The following extensions will be
recognized as GLSL files by default.

`.fp` `.frag` `.frg` `.fs` `.fsh` `.fshader` `.geo` `.geom` `.glsl` `.glslf`
`.glslv` `.gs` `.gshader` `.rchit` `.rmiss` `.shader` `.tesc` `.tese` `.vert`
`.vrx` `.vsh` `.vshader`

Note that `.frag` files are recognized as JavaScript files by default. Add the
following to your Prettier configuration to format them as GLSL.

```json
"overrides": [{"files": ["*.frag"], "options": {"parser": "glsl-parser"}}]
```

## Limitations due to preprocessor

As GLSL includes a C++-style preprocessor, this presents some difficulties when
formatting. For example, the plugin does not attempt to be able to format crazy
(but technically valid) constructs such as:

```glsl
#define LBRACE {
void main() LBRACE
}
```

Instead, the plugin effectively treats preprocessor directives such as `#define`
as their own statements. This covers most cases, for example, the following
works fine:

```glsl
#define AA 2
#define ZERO (min(iFrame, 0))
void main() {
  // ...
  #if AA > 1
  for (int m = ZERO; m < AA; m++)
  for (int n = ZERO; n < AA; n++) {
    // pixel coordinates
    vec2 o = vec2(float(m), float(n)) / float(AA) - 0.5;
    vec2 p = (2.0 * (fragCoord + o) - iResolution.xy) / iResolution.y;
    #else
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    #endif

    // use p

    #if AA > 1
  }
  tot /= float(AA * AA);
  #endif
}
```

However, the following does not, as the `#else` and `#endif` are treated as the
bodies of the if-statement, which leads to the `else` following a `{}` block
instead of an if block, which is invalid.

```glsl
#if FOO
if (a())
#else
if (b())
#endif
{ }
else
{ }
```

In general this approach works well. Of the top 100
[Shadertoy](https://www.shadertoy.com/) shaders, 145/152 compilation units (95%)
can be formatted without any changes.

- 1 has actually invalid code. (It doesn't cause compilation errors as it is
  excluded via `#if/#endif`.)
- 1 uses a not self-contained function macro. (It requires a specific token
  before its call.)
- 4 mix `#if/#else/#endif` and `if/else` which leads to issues as above.
- 1 uses complicated macro constructions to compose music.
