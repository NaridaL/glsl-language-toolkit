void main() {
  // comment before else
  if (foo) {
    // just a comment
  }
  // hello there
  else
  {
    bar();
  }

  // comment after else
  if (foo) {
    // just a comment
  }
  else // hello there
  {
    bar();
  }

  // Comment after short binary statement shouldn't cause a break.
  if (
  a >b// Foobar!
  ) {}
}