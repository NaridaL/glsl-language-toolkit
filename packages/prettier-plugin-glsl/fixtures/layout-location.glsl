layout  (
location = 0) in vec3 
position;

layout ( std140 ) uniform  struct ubo_per_model{    mat4 mvp; };

layout( shared,row_major ) uniform; // default is now shared and row_major

layout(column_major) uniform T3 { 
// shared and column_major
mat4 M3; // column_major
layout(row_major) mat4 m4; // row major
mat3 N2; // column_major
};