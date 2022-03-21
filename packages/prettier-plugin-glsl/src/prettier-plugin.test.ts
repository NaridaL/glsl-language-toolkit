/* eslint-disable */

import { promises as fsp, readdirSync, readFileSync, writeFileSync } from "fs"
import expect from "expect"
import * as prettier from "prettier"
import fetch from "node-fetch"

import * as prettierPlugin from "./prettier-plugin"
import { dedent } from "./testutil"
import fileSize = require("filesize")

function fmt(source: string, printWidth = 80): string {
  return prettier.format(source, {
    parser: "glsl-parser",
    plugins: [prettierPlugin],
    pluginSearchDirs: ["./src/testutil"],

    printWidth,
  })
}

function testFormat(
  source: string,
  expected: string = source,
  printWidth?: number,
  trim = true,
): void {
  const doTrim = (s: string) => (trim ? s.trim() : s)
  const formattedOnce = doTrim(fmt(source, printWidth))
  expect(formattedOnce).toBe(doTrim(expected))
  // Formatting should be stable, i.e. formatting something already formatted
  // should never result in changes.
  const formattedTwice = doTrim(fmt(formattedOnce, printWidth))
  expect(formattedTwice).toBe(formattedOnce)
}

function loadFixture(fixture: string): string {
  return readFileSync(__dirname + "/../fixtures/" + fixture, {
    encoding: "utf8",
  })
}

test("chained binary expressions all break on same op precedence", () => {
  testFormat(
    "int i = a+b+cccccccccccccccccccccccccccccc;",
    "int i =\n  a +\n  b +\n  cccccccccccccccccccccccccccccc;",
    40,
  )
})
describe("indentation", () => {
  test("binary expression in if", () => {
    testFormat(
      dedent`
        void main() {
          if (
            aaaaaaaaaa +
            // a comment
            bbbbbbbbbb +
            eeeeee * fffffff +
            cccccccccc
          ) {}
        }`,
      undefined,
      40,
    )
  })
  test("binary expression as arg", () => {
    const src = dedent`
      void main() {
        f(
          aaaaaaaaaa +
            bbbbbbbbbb +
            eeeeee * fffffff +
            cccccccccc
        );
      }`
    testFormat(src, src, 40)
  })
})
test("comment in empty compound statement", () => {
  testFormat(dedent`
    void main() {
      if (foo) {
        // just a comment
      }
    }`)
})
test("comment after else", () =>
  testFormat(
    dedent`
      void main() {
        if (foo) {
          // just a comment
        } 
        else // hello there
        {
          bar();
        }
      }`,
    dedent`
      void main() {
        if (foo) {
          // just a comment
        } // hello there
        else {
          bar();
        }
      }`,
  ))

test("format es", () => {
  const x = dedent`
    function main() {
      let i = func(sssssssssssssssssssssssssss, sssssssssssssssssssssssssss,ssssssssssssssssss);
    }`
  // v = v ^ (v >> 16);
  // const x = dedent`
  //   function main() {
  //     if (foo) {
  //       // just a comment
  //     }
  //     // hello there
  //     else
  //     {
  //       bar();
  //     }
  //   }`
  const x2 = prettier.format(x, {
    // parser: "estree",

    printWidth: 80,
  })
  expect(x2).toEqual(" sdasd")
})
test("#version directive", () => {
  testFormat("#version   300  es", "#version 300 es\n", undefined, false)
})
test("#pragma directive outputs symbols as-is", () => {
  testFormat(
    "#  pragma  glslify: noise = require('glsl-noise/simplex/3d')",
    "#pragma glslify: noise = require('glsl-noise/simplex/3d')",
  )
})
test("comment before else", () =>
  testFormat(
    dedent`
      void main() {
        if (foo) {
          // just a comment
        } 
        // hello there
        else 
        {
          bar();
        }
      }`,
    dedent`
      void main() {
        if (foo) {
          // just a comment
        } 
        // hello there
        else {
          bar();
        }
      }`,
  ))
describe("initDeclaratorList", () => {
  let x = !!"sdads"
  test("single function does not start on new line", () => {
    testFormat(
      dedent`
      void main() {
        int i = fun(aaaaaaaaaaaaa, bbbbbbbbbbbb, ccccccccccc), k = 3;
        int j = fun(aaaaaaaaaaaaa, bbbbbbbbbbbb, ccccccccccc) * 2;
      }`,
      dedent`
      void main() {
        int i = fun(
            aaaaaaaaaaaaa,
            bbbbbbbbbbbb,
            ccccccccccc
          ),
          k = 3;
        int j =
          fun(
            aaaaaaaaaaaaa,
            bbbbbbbbbbbb,
            ccccccccccc
          ) *
          2;
      }`,
      40,
    )
  })
})
describe("newline is kept", () => {
  test("between two macro definition", () => {
    testFormat(
      dedent`
        #define A 1
        
        #define B 2`,
      dedent`
        #define A (1)
      
        #define B (2)`,
    )
  })
  test("after multiline macro definition", () => {
    testFormat(
      dedent`
        #define A()        \
          void foo() {     \
            return;        \
          }
        
        A()`,
      undefined,
      20,
    )
  })
})

test("required paren are kept", () => {
  testFormat("int i = -(9+b);", "int i = -(9 + b);")
  testFormat("int i = (a ? b : c) ? d : e;", "int i = (a ? b : c) ? d : e;")
  testFormat("int i = (a = b) ? d : e;", "int i = (a = b) ? d : e;")
  testFormat("int i = (a+b).xy;", "int i = (a + b).xy;")
  testFormat("int i = (a + b)[0];", "int i = (a + b)[0];")
  testFormat("int i = (a + b).length();", "int i = (a + b).length();")
  testFormat("int i = foo((1, 2), 3);", "int i = foo((1, 2), 3);")
})
describe("useful paren are kept/added", () => {
  test("v = v ^ (v >> 16)", () =>
    testFormat(
      "void main() { v = v ^ (v >> 16); }",
      dedent`
        void main() {
          v = v ^ (v >> 16);
        }`,
    ))
})
test("constants", () => {
  testFormat("float f = 2.2E+23;", "float f = 2.2e23;")
  testFormat("float f = 2.e-23;", "float f = 2e-23;")
  testFormat("float f = .200;", "float f = 0.2;")
  testFormat("float f = 2.;", "float f = 2.0;")
})
test("for loop", () =>
  testFormat(dedent`
    void f() {
      for (;;);
    }`))
test("simplifies qualifiers", () => {
  testFormat("flat centroid in float f;", "flat in float f;")
})
test("multiple inits in for loop are on same line", () => {
  testFormat(dedent`
    void main() {
      for (int i = 0, j = 2; ; ) {}
    }`)
})

test("format raymarchingPrimitives.glsl", () => {
  // let dif = clamp(
  //   dot(nor, normalize(vec3(0.5, 0.0, 0.6))),
  //   0.0,
  //   1.0,
  //   ssssssssssssssssssssssssss,
  // )
  testFormat(
    loadFixture("raymarchingPrimitives.glsl"),
    loadFixture("raymarchingPrimitives-formatted.glsl"),
  )
})
test("format builtins", () => {
  const s = readFileSync("builtins.glsl", { encoding: "utf-8" })
  testFormat(s, s)
})

interface ShaderToyShader {
  Shader: {
    ver: string // e.g. "0.1"
    info: {
      id: string // e.g. "Xds3zN"
      date: string // e.g. "1364255835"
      viewed: number // e.g. 590432
      name: string // e.g. "Raymarching - Primitives"
      username: string // e.g. "iq"
      description: string // e.g. "A set of raw primitives. [...]"
      likes: number // e.g. 1199
      published: number // e.g. 3
      flags: number // e.g. 0
      usePreview: number // e.g. 0
      tags: string[] // e.g. ["procedural", "3d", "raymarching", "distancefields", "primitives"]
      hasliked: number // e.g. 0
    }
    renderpass: {
      inputs: {
        id: number // e.g. 17
        src: string // e.g. "/media/a/(hash.extension)"
        ctype: string // e.g. "texture"
        channel: number // e.g. 0
      }[]
      outputs: {
        id: number // e.g. 37
        channel: number // e.g. 0
      }[]
      code: string // e.g. "// Copyright Inigo Quilez, 2016 - https://iquilezles.org/ [...]"
      name: string // e.g. "Image"
      description: string // e.g. ""
      type: string // e.g. "image"
    }[]
  }
}

describe("shadertoy top 100 ", () => {
  // Note: Shadertoy shaders can have multiple renderpasses, each of which is
  // its own translation unit/formattable file.

  test.skip("download via api", async () => {
    const resp = await fetch(
      `https://www.shadertoy.com/api/v1/shaders?from=0&num=100&key=${process.env.SHADERTOY_APP_KEY}`,
      { timeout: 0 },
    )
    const json = (await resp.json()) as { Shaders: number; Results: string[] }
    for (let i = 73; i < json.Results.length; i++) {
      const shaderID = json.Results[i]
      console.log("fetching", shaderID, i)
      const resp = await fetch(
        `https://www.shadertoy.com/api/v1/shaders/${shaderID}&key=${process.env.SHADERTOY_APP_KEY}`,
        { timeout: 0 },
      )
      const shader = ((await resp.json()) as ShaderToyShader).Shader
      const filePrefix = `fixtures/shadertoy/shader-${("" + i).padStart(
        2,
        "0",
      )}-${shaderID}`
      await fsp.writeFile(
        `${filePrefix}.json`,
        JSON.stringify(shader, null, "  "),
        { encoding: "utf8" },
      )
      await Promise.all(
        shader.renderpass.map((rp) =>
          fsp.writeFile(`${filePrefix}-${rp.name}.glsl`, rp.code, {
            encoding: "utf8",
          }),
        ),
      )
    }
  }, 1000_000)

  const excludedShaders = [
    "lsSXzD-Image", // has 'else if' in #if block
    "lsSXzD-Sound", // has straight-up invalid code which is excluded via preprocessor
    "4dSGW1-Image", // #if/#else both have '{' but only one matching '}' (mainVR)
    "NslGRN-Image", // weird 'swap' macro which is not self-contained
    "4djGWR-Image", // #if/#else both have '{' but only one matching '}' (mainVR)
  ]
  for (const filename of readdirSync("fixtures/shadertoy")) {
    if (
      filename.endsWith(".glsl") &&
      !excludedShaders.some((es) => filename.includes(es))
    ) {
      const contents = readFileSync("fixtures/shadertoy/" + filename, {
        encoding: "utf8",
      })
      test(filename + " " + fileSize(contents.length), async () => {
        const formatted = fmt(contents)
        const formatted2 = fmt(formatted)
        expect(formatted2).toEqual(formatted)
        writeFileSync("fixtures/shadertoy/testout/" + filename, formatted, {
          encoding: "utf8",
        })
      })
    }
  }
})

test.skip("xx", () => {
  //---------------------------------------------------------------------------------
  // reset
  //---------------------------------------------------------------------------------
  if (iFrame == 0) state = -1.0

  if (state < 0.5) {
    pacmanPos = vec4(13.0, 13.0, 0.0, 0.0)
    pacmanMovDirNex = vec3(0.0, 0.0, 0.0)
    mode = vec3(0.0, -100.0, 0.0)
    ghostPos[0] = vec4(13.0, 19.0, 0.0, 1.0)
    ghostPos[1] = vec4(13.0, 17.0, 0.0, 1.0)
    ghostPos[2] = vec4(12.0, 16.0, 0.0, 1.0)
    ghostPos[3] = vec4(14.0, 15.0, 0.0, 1.0)
  }

  if (state < -0.5) {
    state = 0.0
    points = vec2(0.0, 0.0)
    lives = 3.0
    if (ifragCoord.x < 27 && ifragCoord.y < 31) cell = map(ifragCoord)
  } else if (state < 0.5) {
    state = 1.0
  } else if (state < 1.5) {
    //-------------------
    // pacman
    //-------------------

    // move with keyboard
    if (texelFetch(iChannel1, ivec2(KEY_RIGHT, 0), 0).x > 0.5)
      pacmanMovDirNex.z = 1.0
    if (texelFetch(iChannel1, ivec2(KEY_LEFT, 0), 0).x > 0.5)
      pacmanMovDirNex.z = 2.0
    if (texelFetch(iChannel1, ivec2(KEY_UP, 0), 0).x > 0.5)
      pacmanMovDirNex.z = 3.0
    if (texelFetch(iChannel1, ivec2(KEY_DOWN, 0), 0).x > 0.5)
      pacmanMovDirNex.z = 4.0

    // execute desired turn as soon as possible
    if (
      pacmanMovDirNex.z > 0.5 &&
      abs(
        loadValue(ivec2(pacmanPos.xy) + dir2dis(int(pacmanMovDirNex.z))).x -
          float(W),
      ) > 0.25
    ) {
      pacmanMovDirNex = vec3(pacmanMovDirNex.zz, 0.0)
    }

    if (pacmanMovDirNex.x > 0.5) pacmanPos.z += iTimeDelta * speedPacman

    let off = dir2dis(int(pacmanMovDirNex.x))
    let np = ivec2(pacmanPos.xy) + off
    let c = loadValue(np).x
    pacmanPos.w = step(0.25, abs(c - float(W)))

    if (pacmanPos.z >= 1.0) {
      pacmanPos.z = 0.0
      let c = loadValue(np).x

      if (abs(c - float(W)) < 0.25) {
        pacmanMovDirNex.x = 0.0
      } else {
        pacmanPos.xy += vec2(off)
        // tunnel!
        if (pacmanPos.x < 0.0) pacmanPos.x = 26.0
        else if (pacmanPos.x > 26.0) pacmanPos.x = 0.0
      }

      let isin =
        ifragCoord.x == int(pacmanPos.x) && ifragCoord.y == int(pacmanPos.y)
      c = loadValue(ivec2(pacmanPos.xy)).x
      if (abs(c - float(P)) < 0.2) {
        if (isin) cell = _
        points += vec2(10.0, 1.0)
      } else if (abs(c - float(B)) < 0.2) {
        if (isin) cell = _
        points += vec2(50.0, 1.0)
        mode.x = 1.0
        mode.y = iTime
      }
      if (points.y > 241.5) {
        state = 2.0
      }
    }

    //-------------------
    // ghost
    //-------------------

    for (let i = 0; i < 4; i++) {
      let seed = float(iFrame) * 13.1 + float(i) * 17.43

      ghostPos[i].z += iTimeDelta * speedGhost

      if (ghostPos[i].z >= 1.0) {
        ghostPos[i].z = 0.0

        let c = loadValue(ivec2(ghostPos[i].xy) + dir2dis(int(ghostPos[i].w))).x

        let wr = int(loadValue(ivec2(ghostPos[i].xy) + ivec2(1, 0)).x) == W
        let wl = int(loadValue(ivec2(ghostPos[i].xy) + ivec2(-1, 0)).x) == W
        let wu = int(loadValue(ivec2(ghostPos[i].xy) + ivec2(0, 1)).x) == W
        let wd = int(loadValue(ivec2(ghostPos[i].xy) + ivec2(0, -1)).x) == W

        let ra = vec2(hash(seed + 0.0), hash(seed + 11.57))
        if (
          abs(c - float(W)) < 0.25 // found a wall on the way
        ) {
          if (
            ghostPos[i].w < 2.5 // was moving horizontally
          ) {
            if (!wu && wd) ghostPos[i].w = 3.0
            else if (wu && !wd) ghostPos[i].w = 4.0
            else if (pacmanPos.y > ghostPos[i].y) ghostPos[i].w = 3.0 + mode.x
            else if (pacmanPos.y < ghostPos[i].y) ghostPos[i].w = 4.0 - mode.x
            else ghostPos[i].w = 3.0 - ghostPos[i].w
          } else {
            // was moving vertically
            if (!wr && wl) ghostPos[i].w = 1.0
            else if (wr && !wl) ghostPos[i].w = 2.0
            else if (pacmanPos.x > ghostPos[i].x) ghostPos[i].w = 1.0 + mode.x
            else if (pacmanPos.x < ghostPos[i].x) ghostPos[i].w = 2.0 - mode.x
            else ghostPos[i].w = 7.0 - ghostPos[i].w
          }
        } else if (
          ra.x < intelligence // found an intersection and it decided to find packman
        ) {
          if (
            ghostPos[i].w < 2.5 // was moving horizontally
          ) {
            if (!wu && pacmanPos.y > ghostPos[i].y) ghostPos[i].w = 3.0
            else if (!wd && pacmanPos.y < ghostPos[i].y) ghostPos[i].w = 4.0
          } else {
            // was moving vertically
            if (!wr && pacmanPos.x > ghostPos[i].x) ghostPos[i].w = 1.0
            else if (!wl && pacmanPos.x < ghostPos[i].x) ghostPos[i].w = 2.0
          }
        } else {
          if (ra.y < 0.15) {
            if (!wr) ghostPos[i].w = 1.0
          } else if (ra.y < 0.3) {
            if (!wl) ghostPos[i].w = 2.0
          } else if (ra.y < 0.45) {
            if (!wu) ghostPos[i].w = 3.0
          } else if (ra.y < 0.6) {
            if (!wd) ghostPos[i].w = 4.0
          }
        }

        if (
          abs(ghostPos[i].x - 13.0) < 0.25 &&
          abs(ghostPos[i].y - 19.0) < 0.25 &&
          abs(ghostPos[i].w - 4.0) < 0.25
        ) {
          ghostPos[i].w = 1.0
        }

        ghostPos[i].xy += vec2(dir2dis(int(ghostPos[i].w)))

        // tunnel!
        if (ghostPos[i].x < 0.0) ghostPos[i].x = 26.0
        else if (ghostPos[i].x > 26.0) ghostPos[i].x = 0.0
      }

      // collision
      if (
        abs(pacmanPos.x - ghostPos[i].x) < 0.5 &&
        abs(pacmanPos.y - ghostPos[i].y) < 0.5
      ) {
        if (mode.x < 0.5) {
          lives -= 1.0
          if (lives < 0.5) {
            state = 2.0
          } else {
            state = 0.0
          }
        } else {
          points.x += 200.0
          ghostPos[i] = vec4(13.0, 19.0, 0.0, 1.0)
        }
      }
    }

    //-------------------
    // mode
    //-------------------
    mode.z = (iTime - mode.y) / modeTime
    if (mode.x > 0.5 && mode.z > 1.0) {
      mode.x = 0.0
    }
  } else {
    //if( state > 0.5 )
    let pressSpace = texelFetch(iChannel1, ivec2(KEY_SPACE, 0), 0).x
    if (pressSpace > 0.5) {
      state = -1.0
    }
  }
})
