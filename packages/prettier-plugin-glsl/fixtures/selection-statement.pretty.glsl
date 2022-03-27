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

  // Comment after short binary statement shouldn't cause a break.
  if (
    a > b // Foobar!
  ) {}
}
