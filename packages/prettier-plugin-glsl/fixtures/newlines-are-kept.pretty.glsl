// between two macro definitions
#define A 1

#define B 2

// after multiline macro definition
#define A()                            \
  void foo() {                         \
    return;                            \
  }

A()