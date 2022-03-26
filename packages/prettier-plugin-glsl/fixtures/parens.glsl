void main() {
  // required paren are kept
  int i = -(9+b);
  int i = (a ? b : c) ? d : e;
  int i = (a = b) ? d : e;
  int i = (a+b).xy;
  int i = (a + b)[0];
  int i = (a + b).length();
  int i = foo((1, 2), 3);

  // useful paren are kept/added
  v = v ^ v >> 16;
  v = v ^ (v >> 16);
}