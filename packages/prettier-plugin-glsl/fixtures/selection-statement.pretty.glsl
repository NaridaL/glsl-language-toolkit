void main() {
  if (foo) {
    // just a comment
  }
  // hello there
  else {
    bar();
  }

  // comment after else
  if (foo) {
    // just a comment
  } // hello there
  else {
    bar();
  }
}
