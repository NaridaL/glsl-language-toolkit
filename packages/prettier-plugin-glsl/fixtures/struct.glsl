struct S {
    // space after field
    int aaaaaaaaaaaaaaa;

    int bbbbbbbbbb, ccccccccccc, ddddddddd;
    OtherStruct[CONSTANT_VALUE * MACRO_INVOCATION(2, 3)] eee, ddd;
     float arrayDeclaratorOnField[LONG_CONSTANT], ff[22], fff;

   bool c; // comment

} s1, s2, s333333333333333333333333, s4444;

// if declarations fit on one line they should
struct S2 {
    int foo;
} a, b;
