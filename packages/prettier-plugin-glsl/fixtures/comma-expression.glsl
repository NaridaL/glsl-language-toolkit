void main() {
  // comma expression in for loop body
  float s = 2.;
  float e = 0.;
  vec3 p = vec3(0.);
  for (int j = 0; ++j < 7; )
    p.xz = abs(p.xz) - 2.3,
    p.z = 1.5 - abs(p.z - 1.3),
    p.x = 3. - abs(p.x - 5.),
    p.y = .9 - abs(p.y - .4),
    e = 12. * clamp(.3 / min(dot(p, p), 1.), .0, 1.),
    p = e * p - vec3(7, 1, 1),
    s *= e;

  // simple comma expression
  int a, b;
  a = 1, b = 2;

  // chained comma expression
  a = 1, b = 2, a = 3, b = 4;
}
