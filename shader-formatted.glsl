//7 Built-in Variables
// Implementation dependent constants.  The example values below
// are the minimum values allowed for these maximums.
const mediump int
  gl_MaxVertexAttribs = 16;
const mediump int
  gl_MaxVertexUniformVectors = 256;
const mediump int
  gl_MaxVertexOutputVectors = 16;
const mediump int
  gl_MaxFragmentInputVectors = 15;
const mediump int
  gl_MaxVertexTextureImageUnits = 16;
const mediump int
  gl_MaxCombinedTextureImageUnits = 32;
const mediump int
  gl_MaxTextureImageUnits = 16;
const mediump int
  gl_MaxFragmentUniformVectors = 224;
const mediump int gl_MaxDrawBuffers = 4;
const mediump int
  gl_MinProgramTexelOffset = -8;
const mediump int
  gl_MaxProgramTexelOffset = 7;
/**
 * The variable gl_FragCoord is
 * available as an input variable from
 * within fragment shaders and it holds
 * the window relative coordinates (x,
 * y, z, 1/w) values for the fragment.
 * If multi-sampling, this value can be
 * for any location within the pixel,
 * or one of the fragment samples. The
 * use of centroid does not further
 * restrict this value to be inside the
 * current primitive. This value is the
 * result of the fixed functionality
 * that interpolates primitives after
 * vertex processing to generate
 * fragments. The z component is the
 * depth value that would be used for
 * the fragment’s depth if no shader
 * contained any writes to
 * gl_FragDepth. This is useful for
 * invariance if a shader conditionally
 * computes gl_FragDepth but otherwise
 * wants the fixed functionality
 * fragment depth.
 * 
 */
in highp vec4 gl_FragCoord;
/**
 * Fragment shaders have access to the
 * input built-in variable
 * gl_FrontFacing, whose value is true
 * if the fragment belongs to a
 * front-facing primitive. One use of
 * this is to emulate two-sided
 * lighting by selecting one of two
 * colors calculated by a vertex
 * shader.
 * 
 */
in bool gl_FrontFacing;
/**
 * Writing to gl_FragDepth will
 * establish the depth value for the
 * fragment being processed. If depth
 * buffering is enabled, and no shader
 * writes gl_FragDepth, then the fixed
 * function value for depth will be
 * used as the fragment’s depth value.
 * If a shader statically assigns a
 * value to gl_FragDepth, and there is
 * an execution path through the shader
 * that does not set gl_FragDepth, then
 * the value of the fragment’s depth
 * may be undefined for executions of
 * the shader that take that path. That
 * is, if the set of linked fragment
 * shaders statically contain a write
 * to gl_FragDepth, then it is
 * responsible for always writing it.
 * 
 */
out highp float gl_FragDepth;
/**
 * The values in gl_PointCoord are
 * two-dimensional coordinates
 * indicating where within a point
 * primitive the current fragment is
 * located, when point sprites are
 * enabled. They range from 0.0 to 1.0
 * across the point. If the current
 * primitive is not a point, or if
 * point sprites are not enabled, then
 * the values read from gl_PointCoord
 * are undefined
 * 
 */
in mediump vec2 gl_PointCoord;
/**
 * True if the fragment shader
 * invocation is considered a “helper”
 * invocation and false otherwise. A
 * helper invocation is a fragment
 * shader invocation that is created
 * solely for the purposes of
 * evaluating derivatives for the
 * built-in functions texture()
 * (section 8.9 “Texture Functions”),
 * dFdx(), dFdy(), and fwidth() for
 * other non-helper fragment shader
 * invocations
 * 
 * ragment shader helper invocations
 * execute the same shader code as
 * non-helper invocations, but will not
 * have side effects that modify the
 * framebuffer or other
 * shader-accessible memory. In
 * particular:
 * 
 * - Fragments corresponding to helper
 *   invocations are discarded when
 *   shader execution is complete,
 *   without updating the framebuffer.
 * - Stores to image and buffer
 *   variables performed by helper
 *   invocations have no effect on the
 *   underlying image or buffer memory.
 * - Atomic operations to image,
 *   buffer, or atomic counter
 *   variables performed by helper
 *   invocations have no effect on the
 *   underlying image or buffer memory.
 *   The values returned by such atomic
 *   operations are undefined. Helper
 *   invocations may be generated for
 *   pixels not covered by a primitive
 *   being rendered. While fragment
 *   shader inputs qualified with
 *   "centroid" are normally required
 *   to be sampled in the intersection
 *   of the pixel and the primitive,
 *   the requirement is ignored for
 *   such pixels since there is no
 *   intersection between the pixel and
 *   primitive. Helper invocations may
 *   also be generated for fragments
 *   that are covered by a primitive
 *   being rendered when the fragment
 *   is killed by early fragment tests
 *   (using the early_fragment_tests
 *   qualifier) or where the
 *   implementation is able to
 *   determine that executing the
 *   fragment shader would have no
 *   effect other than assisting in
 *   computing derivatives for other
 *   fragment shader invocations. The
 *   set of helper invocations
 *   generated when processing any set
 *   of primitives is implementation-
 *   dependent
 * 
 */
in bool gl_HelperInvocation;
/**
 * ==== Built-in Functions
 * 
 * The OpenGL ES Shading Language
 * defines an assortment of built-in
 * convenience functions for scalar and
 * vector operations. Many of these
 * built-in functions can be used in
 * more than one type of shader, but
 * some are intended to provide a
 * direct mapping to hardware and so
 * are available only for a specific
 * type of shader. The built-in
 * functions basically fall into three
 * categories:
 * 
 * - They expose some necessary
 *   hardware functionality in a
 *   convenient way such as accessing a
 *   texture map. There is no way in
 *   the language for these functions
 *   to be emulated by a shader.
 * 
 * - They represent a trivial operation
 *   (clamp, mix, etc.) that is very
 *   simple for the user to write, but
 *   they are very common and may have
 *   direct hardware support. It is a
 *   very hard problem for the compiler
 *   to map expressions to complex
 *   assembler instructions.
 * 
 * - They represent an operation
 *   graphics hardware is likely to
 *   accelerate at some point. The
 *   trigonometry functions fall into
 *   this category.
 * 
 * Many of the functions are similar to
 * the same named ones in common C
 * libraries, but they support vector
 * input as well as the more
 * traditional scalar input.
 * Applications should be encouraged to
 * use the built-in functions rather
 * than do the equivalent computations
 * in their own shader code since the
 * built-in functions are assumed to be
 * optimal (e.g., perhaps supported
 * directly in hardware). When the
 * built-in functions are specified
 * below, where the input arguments
 * (and corresponding output) can be
 * float, vec2, vec3, or vec4, genType
 * is used as the argument. Where the
 * input arguments (and corresponding
 * output) can be int, ivec2, ivec3, or
 * ivec4, genIType is used as the
 * argument. Where the input arguments
 * (and corresponding output) can be
 * uint, uvec2, uvec3, or uvec4,
 * genUType is used as the argument.
 * Where the input arguments (or
 * corresponding output) can be bool,
 * bvec2, bvec3, or bvec4, genBType is
 * used as the argument. For any
 * specific use of a function, the
 * actual types substituted for
 * genType, genIType, genUType, or
 * genBType have to have the same
 * number of components for all
 * arguments and for the return type.
 * Similarly for mat, which can be any
 * matrix basic type. The precision of
 * built-in functions is dependent on
 * the function and arguments. There
 * are three categories:
 * 
 * - Some functions have predefined
 *   precisions. The precision is
 *   specified e.g.
 *   `highp ivec2 textureSize (gsampler2D sampler, int lod)`
 * 
 * - For the texture sampling
 *   functions, the precision of the
 *   return type matches the precision
 *   of the sampler type.
 * 
 *   ```
 *   uniform lowp sampler2D sampler;
 *   highp vec2 coord;
 *   // ...
 *   lowp vec4 col = texture (sampler, coord); // texture() returns lowp
 *   ```
 * 
 * - For other built-in functions, a
 *   call will return a precision
 *   qualification matching the highest
 *   precision qualification of the
 *   call's input arguments. See
 *   Section 4.5.2 “Precision
 *   Qualifiers” for more detail.
 * 
 * The built-in functions are assumed
 * to be implemented according to the
 * equations specified in the following
 * sections. The precision at which the
 * calculations are performed follows
 * the general rules for precision of
 * operations as specified in section
 * 4.5.3 “Precision Qualifiers“.
 * 
 * Example: normalize((x, y, z)) = (1 /
 * sqrt(x² + y² + z²)) \* (x, y, z)
 * 
 * If the input vector is lowp, the
 * entire calculation is performed at
 * lowp. For some inputs, this will
 * cause the calculation to overflow,
 * even when the correct result is
 * within the range of lowp.
 * 
 * Angle and Trigonometry Functions
 * 
 * Function parameters specified as
 * angle are assumed to be in units of
 * radians. In no case will any of
 * these functions result in a divide
 * by zero error. If the divisor of a
 * ratio is 0, then results will be
 * undefined. These all operate
 * component-wise. The description is
 * per component.
 * 
 */
// Converts degrees to radians, i.e., PI/180*degrees
genType radians(genType degrees);
// Converts radians to degrees, i.e., 180/PI*radians
genType degrees(genType radians);
//The standard trigonometric sine function.
genType sin(genType angle);
//The standard trigonometric cosine function.
genType cos(genType angle);
//The standard trigonometric tangent.
genType tan(genType angle);
//Arc sine. Returns an angle whose sine is x. The range of values returned by this function is [-PI/2, PI/2].
//Results are undefined if |x|<1.
genType asin(genType x);
//Arc cosine. Returns an angle whose cosine is x. The
//range of values returned by this function is [0, p].
//Results are undefined if |x|<1.
genType acos(genType x);
//Arc tangent. Returns an angle whose tangent is y/x. The
//signs of x and y are used to determine what quadrant the
//angle is in. The range of values returned by this
//function is [-π , π]. Results are undefined if x and y
//are both 0.
genType atan(genType y, genType x);
//Arc tangent. Returns an angle whose tangent is
//y_over_x. The range of values returned by this function is [-PI/2, PI/2].
genType atan(genType y_over_x);
//Returns the hyperbolic sine function (pow(e, x) - pow(e, -x))/2.
genType sinh(genType x);
//Returns the hyperbolic cosine function (pow(e, x) + pow(e, -x))/2.
genType cosh(genType x);
//Returns the hyperbolic tangent function sinh(x)/cosh(x).
genType tanh(genType x);
//Arc hyperbolic sine; returns the inverse of sinh.
genType asinh(genType x);
//Arc hyperbolic cosine; returns the non-negative inverse
//of cosh. Results are undefined if x < 1.
genType acosh(genType x);
//Arc hyperbolic tangent; returns the inverse of tanh.
//Results are undefined if |x|≥1.
genType atanh(genType x);
//////////////////////////
//Exponential Functions
//////////////////////////
//These all operate component-wise. The description is per component.
//Returns x raised to the y power, i.e., x^y.
//Results are undefined if x < 0.
//Results are undefined if x = 0 and y <= 0.
genType pow(genType x, genType y);
//Returns the natural exponentiation of x, i.e., e^x.
genType exp(genType x);
//Returns the natural logarithm of x, i.e., returns the value
//y which satisfies the equation x = ey.
//Results are undefined if x <= 0.
genType log(genType x);
//Returns 2 raised to the x power, i.e., 2^x.
genType exp2(genType x);
//Returns the base 2 logarithm of x, i.e., returns the value
//y which satisfies the equation x= 2^y
//Results are undefined if x <= 0.
genType log2(genType x);
//Returns √x.
//Results are undefined if x < 0.
genType sqrt(genType x);
//Returns 1/(√x)
//Results are undefined if x <= 0.
genType inversesqrt(genType x);
////////////////
//Common Functions
/////////////
//These all operate component-wise. The description is per component.
//Returns x if x >= 0, otherwise it returns -x.
genType abs(genType x);
genIType abs(genIType x);
//Returns 1.0 if x > 0, 0.0 if x = 0, or -1.0 if x < 0.
genType sign(genType x);
genIType sign(genIType x);
//Returns a value equal to the nearest integer that is less
//than or equal to x.
genType floor(genType x);
//Returns a value equal to the nearest integer to x whose
//absolute value is not larger than the absolute value of x.
genType trunc(genType x);
//Returns a value equal to the nearest integer to x. The
//fraction 0.5 will round in a direction chosen by the
//implementation, presumably the direction that is fastest.
//This includes the possibility that round(x) returns the
//same value as roundEven(x) for all values of x.
genType round(genType x);
//Returns a value equal to the nearest integer to x. A
//fractional part of 0.5 will round toward the nearest even
//integer. (Both 3.5 and 4.5 for x will return 4.0.)
genType roundEven(genType x);
//Returns a value equal to the nearest integer that is
//greater than or equal to x.
genType ceil(genType x);
//Returns x - floor (x).
genType fract(genType x);
//Modulus. Returns x - y * floor (x/y).
genType mod(genType x, float y);
genType mod(genType x, genType y);
//Returns the fractional part of x and sets i to the integer
//part (as a whole number floating point value). Both the
//return value and the output parameter will have the same
//sign as x.
//If x has the value +/- INF, the return value should be
//NaN and must be either NaN or 0.0.
genType modf(genType x, genType i);
//Returns y if y < x, otherwise it returns x.
genType min(genType x, genType y);
genType min(genType x, float y);
genIType min(genIType x, genIType y);
genIType min(genIType x, int y);
genUType min(genUType x, genUType y);
genUType min(genUType x, uint y);
//Returns y if x < y, otherwise it returns x.
genType max(genType x, genType y);
genType max(genType x, float y);
genIType max(genIType x, genIType y);
genIType max(genIType x, int y);
genUType max(genUType x, genUType y);
genUType max(genUType x, uint y);
//Returns min (max (x, minVal), maxVal).
//Results are undefined if minVal > maxVal.
genType clamp(
  genType x,
  genType minVal,
  genType maxVal
);
genType clamp(
  genType x,
  float minVal,
  float maxVal
);
genIType clamp(
  genIType x,
  genIType minVal,
  genIType maxVal
);
genIType clamp(
  genIType x,
  int minVal,
  int maxVal
);
genUType clamp(
  genUType x,
  genUType minVal,
  genUType maxVal
);
genUType clamp(
  genUType x,
  uint minVal,
  uint maxVal
);
//Returns the linear blend of x and y, i.e., x*(1-a)+y*a.
genType mix(
  genType x,
  genType y,
  genType a
);
genType mix(
  genType x,
  genType y,
  float a
);
//Selects which vector each returned component comes
//from. For a component of a that is false, the
//corresponding component of x is returned. For a
//component of a that is true, the corresponding
//component of y is returned. Components of x and y that
//are not selected are allowed to be invalid floating point
//values and will have no effect on the results. Thus, this
//provides different functionality than
//genType mix(genType x, genType y, genType(a));
//where a is a Boolean vector.
genType mix(
  genType x,
  genType y,
  genBType a
);
//Returns 0.0 if x < edge, otherwise it returns 1.0.
genType step(genType edge, genType x);
genType step(float edge, genType x);
//Returns 0.0 if x <= edge0 and 1.0 if x >= edge1 and
//performs smooth Hermite interpolation between 0 and 1
//when edge0 < x < edge1. This is useful in cases where
//you would want a threshold function with a smooth
//transition. This is equivalent to:
//genType t;
//t = clamp ((x - edge0) / (edge1 - edge0), 0, 1);
//return t * t * (3 - 2 * t);
//Results are undefined if edge0 >= edge1.
genType smoothstep(
  genType edge0,
  genType edge1,
  genType x
);
genType smoothstep(
  float edge0,
  float edge1,
  genType x
);
//Returns true if x holds a NaN. Returns false otherwise.
genBType isnan(genType x);
//Returns true if x holds a positive infinity or negative
//infinity. Returns false otherwise.
genBType isinf(genType x);
//Returns a signed or unsigned highp integer value
//representing the encoding of a floating-point value. For
//highp floating point, the value's bit level representation
//is preserved. For mediump and lowp, the value is first
//converted to highp floating point and the encoding of
//that value is returned.
genIType floatBitsToInt(genType value);
genUType floatBitsToUint(genType value);
//Returns a highp floating-point value corresponding to a
//signed or unsigned integer encoding of a floating-point
//value. If an inf or NaN is passed in, it will not signal,
//and the resulting floating point value is unspecified.
//Otherwise, the bit-level representation is preserved. For
//lowp and mediump, the value is first converted to the
//corresponding signed or unsigned highp integer and then
//reinterpreted as a highp floating point value as before.
genType intBitsToFloat(genIType value);
genType uintBitsToFloat(genUType value);
///////////////////////////
//Floating-Point Pack and Unpack Functions
////////////////////////////////
//These functions do not operate component-wise, rather as described in each case.
//First, converts each component of the normalized
//floating-point value v into 16-bit integer values. Then,
//the results are packed into the returned 32-bit unsigned
//integer.
//The conversion for component c of v to fixed point is
//done as follows:
//packSnorm2x16: round(clamp(c, -1, +1) * 32767.0)
//The first component of the vector will be written to the
//least significant bits of the output; the last component
//will be written to the most significant bits.
highp uint packSnorm2x16(vec2 v);
//First, unpacks a single 32-bit unsigned integer p into a
//pair of 16-bit signed integers. Then, each component is
//converted to a normalized floating-point value to
//generate the returned two-component vector.
//The conversion for unpacked fixed-point value f to
//floating point is done as follows:
//unpackSnorm2x16: clamp(f / 32767.0, -1,+1)
//The first component of the returned vector will be
//extracted from the least significant bits of the input; the
//last component will be extracted from the most
//significant bits.
highp vec2 unpackSnorm2x16(
  highp uint p
);
//First, converts each component of the normalized
//floating-point value v into 16-bit integer values. Then,
//the results are packed into the returned 32-bit unsigned
//integer.
//The conversion for component c of v to fixed point is
//done as follows:
//packUnorm2x16: round(clamp(c, 0, +1) * 65535.0)
//The first component of the vector will be written to the
//least significant bits of the output; the last component
//will be written to the most significant bits.
highp uint packUnorm2x16(vec2 v);
//First, unpacks a single 32-bit unsigned integer p into a
//pair of 16-bit unsigned integers. Then, each component
//is converted to a normalized floating-point value to
//generate the returned two-component vector.
//The conversion for unpacked fixed-point value f to
//floating point is done as follows:
//unpackUnorm2x16: f / 65535.0
//The first component of the returned vector will be
//extracted from the least significant bits of the input; the
//last component will be extracted from the most
//significant bits.
highp vec2 unpackUnorm2x16(
  highp uint p
);
//Returns an unsigned integer obtained by converting the
//components of a two-component floating-point vector to
//the 16-bit floating-point representation found in the
//OpenGL ES Specification, and then packing these two
//16-bit integers into a 32-bit unsigned integer.
//The first vector component specifies the 16 leastsignificant bits of the result; the second component
//specifies the 16 most-significant bits.
highp uint packHalf2x16(mediump vec2 v);
//Returns a two-component floating-point vector with
//components obtained by unpacking a 32-bit unsigned
//integer into a pair of 16-bit values, interpreting those
//values as 16-bit floating-point numbers according to the
//OpenGL ES Specification, and converting them to 32-bit
//floating-point values.
//The first component of the vector is obtained from the
//16 least-significant bits of v; the second component is
//obtained from the 16 most-significant bits of v.
mediump vec2 unpackHalf2x16(
  highp uint v
);
//////////////////
//Geometric Functions
/////////////////////////
//These operate on vectors as vectors, not component-wise.
//Returns the length of vector x, i.e., sqrt(x[0]^2 + x[1]^2 + ...)
float length(genType x);
//Returns the distance between p0 and p1, i.e., length (p0 - p1)
float distance(genType p0, genType p1);
//Returns the dot product of x and y, i.e., x[0]*y[0] + x[1]*y[1] + ...
float dot(genType x, genType y);
//Returns the cross product of x and y, i.e.,
//vec3(
//  x[1]*y[2]- y[1]*x[2],
//  x[2]*y[0]- y[2]*x[0],
//  x[0]*y[1]- y[0]*x[1])
vec3 cross(vec3 x, vec3 y);
//Returns a vector in the same direction as x but with a length of 1 i.e.
// x/length(x)
genType normalize(genType x);
// Orients a vector to point away from a surface as defined by its normal.
//If dot(Nref, I) < 0 return N, otherwise return -N.
genType faceforward(
  genType N,
  genType I,
  genType Nref
);
//For the incident vector I and surface orientation N,
//returns the reflection direction:
//I - 2 * dot(N, I) * N
//N must already be normalized in order to achieve the
//desired result.
genType reflect(genType I, genType N);
//For the incident vector I and surface normal N, and the
//ratio of indices of refraction eta, return the refraction
//vector. The result is computed by
//k = 1.0 - eta * eta * (1.0 - dot(N, I) * dot(N, I))
//if (k < 0.0)
//return genType(0.0)
//else
//return eta * I - (eta * dot(N, I) + sqrt(k)) * N
//The input parameters for the incident vector I and the
//surface normal N must already be normalized to get the
//desired results.
genType refract(
  genType I,
  genType N,
  float eta
);
//////////////////////
//Matrix Functions
///////////////////////////////
//Multiply matrix x by matrix y component-wise, i.e.,
//result[i][j] is the scalar product of x[i][j] and y[i][j].
//Note: to get linear algebraic matrix multiplication, use
//the multiply operator (*).
mat matrixCompMult(mat x, mat y);
//Treats the first parameter c as a column vector (matrix
//with one column) and the second parameter r as a row
//vector (matrix with one row) and does a linear algebraic
//matrix multiply c * r, yielding a matrix whose number of
//rows is the number of components in c and whose
//number of columns is the number of components in r.
mat2 outerProduct(vec2 c, vec2 r);
mat3 outerProduct(vec3 c, vec3 r);
mat4 outerProduct(vec4 c, vec4 r);
mat2x3 outerProduct(vec3 c, vec2 r);
mat3x2 outerProduct(vec2 c, vec3 r);
mat2x4 outerProduct(vec4 c, vec2 r);
mat4x2 outerProduct(vec2 c, vec4 r);
mat3x4 outerProduct(vec4 c, vec3 r);
mat4x3 outerProduct(vec3 c, vec4 r);
//Returns a matrix that is the transpose of m. The input
//matrix m is not modified.
mat2 transpose(mat2 m);
mat3 transpose(mat3 m);
mat4 transpose(mat4 m);
mat2x3 transpose(mat3x2 m);
mat3x2 transpose(mat2x3 m);
mat2x4 transpose(mat4x2 m);
mat4x2 transpose(mat2x4 m);
mat3x4 transpose(mat4x3 m);
mat4x3 transpose(mat3x4 m);
//Returns the determinant of m.
float determinant(mat2 m);
float determinant(mat3 m);
float determinant(mat4 m);
//Returns a matrix that is the inverse of m. The input
//matrix m is not modified. The values in the returned
//matrix are undefined if m is singular or poorlyconditioned (nearly singular).
mat2 inverse(mat2 m);
mat3 inverse(mat3 m);
mat4 inverse(mat4 m);
/////////////////////////
//Vector Relational Functions
////////////////////////////////
//Relational and equality operators (<, <=, >, >=, ==, !=) are defined to produce scalar Boolean results. For
//vector results, use the following built-in functions. Below, “bvec” is a placeholder for one of bvec2,
//bvec3, or bvec4, “ivec” is a placeholder for one of ivec2, ivec3, or ivec4, “uvec” is a placeholder for
//uvec2, uvec3, or uvec4, and “vec” is a placeholder for vec2, vec3, or vec4. In all cases, the sizes of the
//input and return vectors for any particular call must match.
//Returns the component-wise compare of x < y.
bvec lessThan(vec x, vec y);
bvec lessThan(ivec x, ivec y);
bvec lessThan(uvec x, uvec y);
//Returns the component-wise compare of x <= y.
bvec lessThanEqual(vec x, vec y);
bvec lessThanEqual(ivec x, ivec y);
bvec lessThanEqual(uvec x, uvec y);
//Returns the component-wise compare of x > y.
bvec greaterThan(vec x, vec y);
bvec greaterThan(ivec x, ivec y);
bvec greaterThan(uvec x, uvec y);
//Returns the component-wise compare of x >= y.
bvec greaterThanEqual(vec x, vec y);
bvec greaterThanEqual(ivec x, ivec y);
bvec greaterThanEqual(uvec x, uvec y);
//Returns the component-wise compare of x == y.
bvec equal(vec x, vec y);
bvec equal(ivec x, ivec y);
bvec equal(uvec x, uvec y);
bvec equal(bvec x, bvec y);
//Returns the component-wise compare of x != y.
bvec notEqual(vec x, vec y);
bvec notEqual(ivec x, ivec y);
bvec notEqual(uvec x, uvec y);
bvec notEqual(bvec x, bvec y);
//Returns true if any component of x is true.
bool any(bvec x);
//Returns true only if all components of x are true.
bool all(bvec x);
//Returns the component-wise logical complement of x.
bvec not(bvec x);
/**
 * TEXTURE LOOKUP FUNCTIONS
 * 
 * Texture lookup functions are
 * available to vertex and fragment
 * shaders. However, level of detail is
 * not implicitly computed for vertex
 * shaders. The functions in the table
 * below provide access to textures
 * through samplers, as set up through
 * the OpenGL ES API. Texture
 * properties such as size, pixel
 * format, number of dimensions,
 * filtering method, number of mip-map
 * levels, depth comparison, and so on
 * are also defined by OpenGL ES API
 * calls. Such properties are taken
 * into account as the texture is
 * accessed via the built-in functions
 * defined below.
 * 
 * Texture data can be stored by the GL
 * as floating point, unsigned
 * normalized integer, unsigned integer
 * or signed integer data. This is
 * determined by the type of the
 * internal format of the texture.
 * Texture lookups on unsigned
 * normalized integer data return
 * floating point values in the range
 * [0, 1].
 * 
 * Texture lookup functions are
 * provided that can return their
 * result as floating point, unsigned
 * integer or signed integer, depending
 * on the sampler type passed to the
 * lookup function. Care must be taken
 * to use the right sampler type for
 * texture access. The following table
 * lists the supported combinations of
 * sampler types and texture internal
 * formats. Blank entries are
 * unsupported. Doing a texture lookup
 * will return undefined values for
 * unsupported combinations.
 * 
 * Internal Texture Format | Floating
 * Point | Signed Integer | Unsigned
 * Integer | Sampler Types | Sampler
 * Types | Sampler Types
 * 
 * ---
 * 
 * Floating point | Supported | |
 * Normalized Integer | Supported | |
 * Signed Integer | | Supported |
 * Unsigned Integer | | | Supported
 * 
 * If an integer sampler type is used,
 * the result of a texture lookup is an
 * ivec4. If an unsigned integer
 * sampler type is used, the result of
 * a texture lookup is a uvec4. If a
 * floating point sampler type is used,
 * the result of a texture lookup is a
 * vec4.
 * 
 * In the prototypes below, the “g” in
 * the return type “gvec4” is used as a
 * placeholder for nothing, “i”, or “u”
 * making a return type of vec4, ivec4,
 * or uvec4. In these cases, the
 * sampler argument type also starts
 * with “g”, indicating the same
 * substitution done on the return
 * type; it is either a floating point,
 * signed integer, or unsigned integer
 * sampler, matching the basic type of
 * the return type, as described above.
 * 
 * For shadow forms (the sampler
 * parameter is a shadow-type), a depth
 * comparison lookup on the depth
 * texture bound to sampler is done as
 * described in section 3.8.16 “Texture
 * Comparison Modes” of the OpenGL ES
 * Graphics System Specification. See
 * the table below for which component
 * specifies Dref. The texture bound to
 * sampler must be a depth texture, or
 * results are undefined. If a
 * non-shadow texture call is made to a
 * sampler that represents a depth
 * texture with depth comparisons
 * turned on, then results are
 * undefined. If a shadow texture call
 * is made to a sampler that represents
 * a depth texture with depth
 * comparisons turned off, then results
 * are undefined. If a shadow texture
 * call is made to a sampler that does
 * not represent a depth texture, then
 * results are undefined.
 * 
 * In all functions below, the bias
 * parameter is optional for fragment
 * shaders. The bias parameter is not
 * accepted in a vertex shader. For a
 * fragment shader, if bias is present,
 * it is added to the implicit level of
 * detail prior to performing the
 * texture access operation.
 * 
 * The implicit level of detail is
 * selected as follows: For a texture
 * that is not mip-mapped, the texture
 * is used directly. If it is
 * mip-mapped and running in a fragment
 * shader, the LOD computed by the
 * implementation is used to do the
 * texture lookup. If it is mip-mapped
 * and running on the vertex shader,
 * then the base texture is used.
 * 
 * Some texture functions (non-“Lod”
 * and non-“Grad” versions) may require
 * implicit derivatives. Implicit
 * derivatives are undefined within
 * non-uniform control flow and for
 * vertex texture fetches. For Cube
 * forms, the direction of P is used to
 * select which face to do a
 * 2-dimensional texture lookup in, as
 * described in section 3.8.10 “Cube
 * Map Texture Selection” in the OpenGL
 * ES Graphics System Specification.
 * For Array forms, the array layer
 * used will be max (0,min (d -1,
 * floor(layer+0.5)))
 * 
 * where d is the depth of the texture
 * array and layer comes from the
 * component indicated in the tables
 * below.
 * 
 */
//Returns the dimensions of
//level lod for the texture bound
//to sampler, as described in
//section 2.11.9 “Shader
//Execution” of the OpenGL ES
//3.0 Graphics System
//Specification, under “Texture
//Size Query”.
//
//The components in the return
//value are filled in, in order,
//with the width, height, depth of
//the texture.
//
//For the array forms, the last
//component of the return value
//is the number of layers in the
//texture array.
highp ivec2 textureSize(
  gsampler2D sampler,
  int lod
);
highp ivec3 textureSize(
  gsampler3D sampler,
  int lod
);
highp ivec2 textureSize(
  gsamplerCube sampler,
  int lod
);
highp ivec2 textureSize(
  sampler2DShadow sampler,
  int lod
);
highp ivec2 textureSize(
  samplerCubeShadow sampler,
  int lod
);
highp ivec3 textureSize(
  gsampler2DArray sampler,
  int lod
);
highp ivec3 textureSize(
  sampler2DArrayShadow sampler,
  int lod
);
//Use the texture coordinate P to
//do a texture lookup in the
//texture currently bound to
//sampler. The last component
//of P is used as Dref for the
//shadow forms. For array
//forms, the array layer comes
//from the last component of P
//in the non-shadow forms, and
//the second to last component
//of P in the shadow forms.
gvec4 texture(
  gsampler2D sampler,
  vec2 P
);
gvec4 texture(
  gsampler2D sampler,
  vec2 P,
  float bias
);
gvec4 texture(
  gsampler3D sampler,
  vec3 P
);
gvec4 texture(
  gsampler3D sampler,
  vec3 P,
  float bias
);
gvec4 texture(
  gsamplerCube sampler,
  vec3 P
);
gvec4 texture(
  gsamplerCube sampler,
  vec3 P,
  float bias
);
float texture(
  sampler2DShadow sampler,
  vec3 P
);
float texture(
  sampler2DShadow sampler,
  vec3 P,
  float bias
);
float texture(
  samplerCubeShadow sampler,
  vec4 P
);
float texture(
  samplerCubeShadow sampler,
  vec4 P,
  float bias
);
gvec4 texture(
  gsampler2DArray sampler,
  vec3 P
);
gvec4 texture(
  gsampler2DArray sampler,
  vec3 P,
  float bias
);
float texture(
  sampler2DArrayShadow sampler,
  vec4 P
);
//Do a texture lookup with
//projection. The texture
//coordinates consumed from P,
//not including the last
//component of P, are divided by
//the last component of P to
//form projected coordinates P'.
//The resulting third component
//of P' in the shadow forms is
//used as Dref. The third
//component of P is ignored
//when sampler has type
//gsampler2D and P has type
//vec4. After these values are
//computed, texture lookup
//proceeds as in texture.
gvec4 textureProj(
  gsampler2D sampler,
  vec3 P
);
gvec4 textureProj(
  gsampler2D sampler,
  vec3 P,
  float bias
);
gvec4 textureProj(
  gsampler2D sampler,
  vec4 P
);
gvec4 textureProj(
  gsampler2D sampler,
  vec4 P,
  float bias
);
gvec4 textureProj(
  gsampler3D sampler,
  vec4 P
);
gvec4 textureProj(
  gsampler3D sampler,
  vec4 P,
  float bias
);
float textureProj(
  sampler2DShadow sampler,
  vec4 P
);
float textureProj(
  sampler2DShadow sampler,
  vec4 P,
  float bias
);
//Do a texture lookup as in
//texture but with explicit LOD;
//lod specifies λ_base and sets the
//partial derivatives as follows.
//(See section 3.8.9 “Texture
//Minification” and equation
//3.14 in the OpenGL ES 3.0
//Graphics System
//Specification.)
//∂u/∂x=0 ∂v/∂x=0 ∂w/∂x=0
//∂u/∂y=0 ∂v/∂y=0 ∂w/∂y=0
gvec4 textureLod(
  gsampler2D sampler,
  vec2 P,
  float lod
);
gvec4 textureLod(
  gsampler3D sampler,
  vec3 P,
  float lod
);
gvec4 textureLod(
  gsamplerCube sampler,
  vec3 P,
  float lod
);
float textureLod(
  sampler2DShadow sampler,
  vec3 P,
  float lod
);
gvec4 textureLod(
  gsampler2DArray sampler,
  vec3 P,
  float lod
);
//Do a texture lookup as in
//texture but with offset added
//to the (u,v,w) texel coordinates
//before looking up each texel.
//The offset value must be a
//constant expression. A limited
//range of offset values are
//supported; the minimum and
//maximum offset values are
//implementation-dependent and
//given by
//MIN_PROGRAM_TEXEL_OFFSET and
//MAX_PROGRAM_TEXEL_OFFSET,
//respectively.
//Note that offset does not apply
//to the layer coordinate for
//texture arrays. This is
//explained in detail in section
//3.8.9 “Texture Minification” of
//the OpenGL ES Graphics
//System Specification, where
//offset is (𝛿_ , 𝛿_v ,𝛿_w). Note
//that texel offsets are also not
//supported for cube maps.
gvec4 textureOffset(
  gsampler2D sampler,
  vec2 P,
  ivec2 offset
);
gvec4 textureOffset(
  gsampler2D sampler,
  vec2 P,
  ivec2 offset,
  float bias
);
gvec4 textureOffset(
  gsampler3D sampler,
  vec3 P,
  ivec3 offset
);
gvec4 textureOffset(
  gsampler3D sampler,
  vec3 P,
  ivec3 offset,
  float bias
);
float textureOffset(
  sampler2DShadow sampler,
  vec3 P,
  ivec2 offset
);
float textureOffset(
  sampler2DShadow sampler,
  vec3 P,
  ivec2 offset,
  float bias
);
gvec4 textureOffset(
  gsampler2DArray sampler,
  vec3 P,
  ivec2 offset
);
gvec4 textureOffset(
  gsampler2DArray sampler,
  vec3 P,
  ivec2 offset,
  float bias
);
//Use integer texture coordinate
//P to lookup a single texel from
//sampler. The array layer
//comes from the last component
//of P for the array forms. The
//level-of-detail lod is as
//described in sections 2.11.9
//“Shader Execution” under
//Texel Fetches and 3.8
//“Texturing” of the OpenGL ES
//3.0 Graphics System
//Specification.
gvec4 texelFetch(
  gsampler2D sampler,
  ivec2 P,
  int lod
);
gvec4 texelFetch(
  gsampler3D sampler,
  ivec3 P,
  int lod
);
gvec4 texelFetch(
  gsampler2DArray sampler,
  ivec3 P,
  int lod
);
//Fetch a single texel as in
//texelFetch offset by offset as
//described in textureOffset.
gvec4 texelFetchOffset(
  gsampler2D sampler,
  ivec2 P,
  int lod,
  ivec2 offset
);
gvec4 texelFetchOffset(
  gsampler3D sampler,
  ivec3 P,
  int lod,
  ivec3 offset
);
gvec4 texelFetchOffset(
  gsampler2DArray sampler,
  ivec3 P,
  int lod,
  ivec2 offset
);
//Do a projective texture lookup
//as described in textureProj
//offset by offset as described in
//textureOffset.
gvec4 textureProjOffset(
  gsampler2D sampler,
  vec3 P,
  ivec2 offset
);
gvec4 textureProjOffset(
  gsampler2D sampler,
  vec3 P,
  ivec2 offset,
  float bias
);
gvec4 textureProjOffset(
  gsampler2D sampler,
  vec4 P,
  ivec2 offset
);
gvec4 textureProjOffset(
  gsampler2D sampler,
  vec4 P,
  ivec2 offset,
  float bias
);
gvec4 textureProjOffset(
  gsampler3D sampler,
  vec4 P,
  ivec3 offset
);
gvec4 textureProjOffset(
  gsampler3D sampler,
  vec4 P,
  ivec3 offset,
  float bias
);
float textureProjOffset(
  sampler2DShadow sampler,
  vec4 P,
  ivec2 offset,
  float bias
);
float textureProjOffset(
  sampler2DShadow sampler,
  vec4 P,
  ivec2 offset,
  float bias
);
//Do an offset texture lookup
//with explicit LOD. See
//textureLod and
//textureOffset.
gvec4 textureLodOffset(
  gsampler2D sampler,
  vec2 P,
  float lod,
  ivec2 offset
);
gvec4 textureLodOffset(
  gsampler3D sampler,
  vec3 P,
  float lod,
  ivec3 offset
);
float textureLodOffset(
  sampler2DShadow sampler,
  vec3 P,
  float lod,
  ivec2 offset
);
gvec4 textureLodOffset(
  gsampler2DArray sampler,
  vec3 P,
  float lod,
  ivec2 offset
);
//Do a projective texture lookup
//with explicit LOD. See
//textureProj and textureLod.
gvec4 textureProjLod(
  gsampler2D sampler,
  vec3 P,
  float lod
);
gvec4 textureProjLod(
  gsampler2D sampler,
  vec4 P,
  float lod
);
gvec4 textureProjLod(
  gsampler3D sampler,
  vec4 P,
  float lod
);
float textureProjLod(
  sampler2DShadow sampler,
  vec4 P,
  float lod
);
//Do an offset projective texture
//lookup with explicit LOD. See
//textureProj, textureLod, and
//textureOffset.
gvec4 textureProjLodOffset(
  gsampler2D sampler,
  vec3 P,
  float lod,
  ivec2 offset
);
gvec4 textureProjLodOffset(
  gsampler2D sampler,
  vec4 P,
  float lod,
  ivec2 offset
);
gvec4 textureProjLodOffset(
  gsampler3D sampler,
  vec4 P,
  float lod,
  ivec3 offset
);
float textureProjLodOffset(
  sampler2DShadow sampler,
  vec4 P,
  float lod,
  ivec2 offset
);
// TODO FIX COMMENT
//Do a texture lookup as in
//texture but with explicit
//gradients. The partial
//derivatives of P are with
//respect to window x and
//window y. Set
//∂s
//∂x
//∂s
//∂y
//∂t
//∂x
//∂t
//∂y
//∂r
//∂x
//∂r
//∂y
//=
//=
//=
//=
//=
//=
//∂P.s
//∂x
//∂P.s
//∂y
//∂P.t
//∂x
//∂P.t
//∂y
//∂P.p
//cube
//∂x
//∂P.p
//cube
//∂y
//For the cube version, the
//partial derivatives of P are
//assumed to be in the
//coordinate system used before
//texture coordinates are
//projected onto the appropriate
//cube face.
gvec4 textureGrad(
  gsampler2D sampler,
  vec2 P,
  vec2 dPdx,
  vec2 dPdy
);
gvec4 textureGrad(
  gsampler3D sampler,
  vec3 P,
  vec3 dPdx,
  vec3 dPdy
);
gvec4 textureGrad(
  gsamplerCube sampler,
  vec3 P,
  vec3 dPdx,
  vec3 dPdy
);
float textureGrad(
  sampler2DShadow sampler,
  vec3 P,
  vec2 dPdx,
  vec2 dPdy
);
float textureGrad(
  samplerCubeShadow sampler,
  vec4 P,
  vec3 dPdx,
  vec3 dPdy
);
gvec4 textureGrad(
  gsampler2DArray sampler,
  vec3 P,
  vec2 dPdx,
  vec2 dPdy
);
float textureGrad(
  sampler2DArrayShadow sampler,
  vec4 P,
  vec2 dPdx,
  vec2 dPdy
);
//Do a texture lookup with both
//explicit gradient and offset, as
//described in textureGrad and
//textureOffset.
gvec4 textureGradOffset(
  gsampler2D sampler,
  vec2 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
gvec4 textureGradOffset(
  gsampler3D sampler,
  vec3 P,
  vec3 dPdx,
  vec3 dPdy,
  ivec3 offset
);
float textureGradOffset(
  sampler2DShadow sampler,
  vec3 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
gvec4 textureGradOffset(
  gsampler2DArray sampler,
  vec3 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
float textureGradOffset(
  sampler2DArrayShadow sampler,
  vec4 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
//Do a texture lookup both
//projectively, as described in
//textureProj, and with explicit
//gradient as described in
//textureGrad. The partial
//derivatives dPdx and dPdy are
//assumed to be already
//projected.
gvec4 textureProjGrad(
  gsampler2D sampler,
  vec3 P,
  vec2 dPdx,
  vec2 dPdy
);
gvec4 textureProjGrad(
  gsampler2D sampler,
  vec4 P,
  vec2 dPdx,
  vec2 dPdy
);
gvec4 textureProjGrad(
  gsampler3D sampler,
  vec4 P,
  vec3 dPdx,
  vec3 dPdy
);
float textureProjGrad(
  sampler2DShadow sampler,
  vec4 P,
  vec2 dPdx,
  vec2 dPdy
);
//Do a texture lookup
//projectively and with explicit
//gradient as described in
//textureProjGrad, as well as
//with offset, as described in
//textureOffset.
gvec4 textureProjGradOffset(
  gsampler2D sampler,
  vec3 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
gvec4 textureProjGradOffset(
  gsampler2D sampler,
  vec4 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
gvec4 textureProjGradOffset(
  gsampler3D sampler,
  vec4 P,
  vec3 dPdx,
  vec3 dPdy,
  ivec3 offset
);
float textureProjGradOffset(
  sampler2DShadow sampler,
  vec4 P,
  vec2 dPdx,
  vec2 dPdy,
  ivec2 offset
);
// TODO FIX COMMENT
/////////////////////////////
//Fragment Processing Functions
//////////////////////////////////
//Fragment processing functions are only available in fragment shaders.
//Derivatives may be computationally expensive and/or numerically unstable. Therefore, an OpenGL ES
//implementation may approximate the true derivatives by using a fast but not entirely accurate derivative
//computation. Derivatives are undefined within non-uniform control flow.
//The expected behavior of a derivative is specified using forward/backward differencing.
//Forward differencing:
//F  xdx -F  x ~ dFdx  x⋅dx
//dFdx  x ~
//F  xdx -F  x
//dx
//1a
//1b
//Backward differencing:
//F  x-dx -F  x ~ -dFdx x⋅dx
//dFdx  x ~
//F  x-F x-dx
//dx
//2a
//2b
//With single-sample rasterization, dx <= 1.0 in equations 1b and 2b. For multi-sample rasterization, dx <
//2.0 in equations 1b and 2b.
//dFdy is approximated similarly, with y replacing x.
//An OpenGL ES implementation may use the above or other methods to perform the calculation, subject to
//the following conditions:
//1. The method may use piecewise linear approximations. Such linear approximations imply that higher
//order derivatives, dFdx(dFdx(x)) and above, are undefined.
//2. The method may assume that the function evaluated is continuous. Therefore derivatives within the
//body of a non-uniform conditional are undefined.
//3. The method may differ per fragment, subject to the constraint that the method may vary by window
//coordinates, not screen coordinates. The invariance requirement described in section 3.2 “Invariance”
//of the OpenGL ES Graphics System Specification, is relaxed for derivative calculations, because the
//method may be a function of fragment location.
//Other properties that are desirable, but not required, are:
//4. Functions should be evaluated within the interior of a primitive (interpolated, not extrapolated).
//5. Functions for dFdx should be evaluated while holding y constant. Functions for dFdy should be
//evaluated while holding x constant. However, mixed higher order derivatives, like dFdx(dFdy(y))
//and dFdy(dFdx(x)) are undefined.
//6. Derivatives of constant arguments should be 0.
//In some implementations, varying degrees of derivative accuracy may be obtained by providing GL hints
//(section 5.3 “Hints” of the OpenGL ES 3.0 Graphics System Specification), allowing a user to make an
//image quality versus speed trade off.
//Returns the derivative in x using local differencing for
//the input argument p.
genType dFdx(genType p);
//Returns the derivative in y using local differencing for
//the input argument p.
//These two functions are commonly used to estimate the
//filter width used to anti-alias procedural textures. We
//are assuming that the expression is being evaluated in
//parallel on a SIMD array so that at any given point in
//time the value of the function is known at the grid points
//represented by the SIMD array. Local differencing
//between SIMD array elements can therefore be used to
//derive dFdx, dFdy, etc.
genType dFdy(genType p);
//Returns the sum of the absolute derivative in x and y
//using local differencing for the input argument p, i.e.,
//abs (dFdx (p)) + abs (dFdy (p));
genType fwidth(genType p);