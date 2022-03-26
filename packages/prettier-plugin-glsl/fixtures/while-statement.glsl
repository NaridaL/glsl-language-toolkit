void main() {
    // empty block
    while (i++ < 4) {}

    // empty statement
    while (i++ < 4);

    while (i++ < 4) a = b + c;

    while (i++ < 4) {
        a = b + c;
    }
}