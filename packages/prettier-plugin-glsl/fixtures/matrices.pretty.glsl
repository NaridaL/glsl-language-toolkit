mat3 x = mat3(
  1   , 2   , 3   ,
  4   , 5   , 6   ,
  7   , 8   , 9.99
);

const mat3 YIQ2RGB = mat3(
    1.0  ,   1.0  , 123.0  ,
    0.956,  -0.272,  -1.106,
    0.621,  -0.647,   1.703
);

mat3x3 x;
mat3 y;

float minus36 = determinant(
  mat4(
    1, 5, 9, 4,
    2, 6, 1, 5,
    3, 7, 2, 6,
    4, 8, 3, 8
  )
);