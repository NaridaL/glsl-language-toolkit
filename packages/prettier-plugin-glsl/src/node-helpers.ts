import { TokenType } from "chevrotain"
import { TOKEN } from "./lexer"

export function getMatrixDimensions(
  t: TokenType,
): [cols: number, rows: number] | undefined {
  switch (t) {
    case TOKEN.MAT2X2:
      return [2, 2]
    case TOKEN.MAT2X3:
      return [2, 3]
    case TOKEN.MAT2X4:
      return [2, 4]
    case TOKEN.MAT3X2:
      return [3, 2]
    case TOKEN.MAT3X3:
      return [3, 3]
    case TOKEN.MAT3X4:
      return [3, 4]
    case TOKEN.MAT4X2:
      return [4, 2]
    case TOKEN.MAT4X3:
      return [4, 3]
    case TOKEN.MAT4X4:
      return [4, 4]
    default:
      return undefined
  }
}
