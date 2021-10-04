import { Matrix } from "./builtins"

export function inverse2(m: Matrix): Matrix {
  const r = Object.assign(Array(4), { rows: 2 })

  const det = m[0] * m[3] - m[2] * m[1]

  r[0] = m[3] / det
  r[1] = -m[1] / det

  r[2] = -m[2] / det
  r[3] = m[0] / det

  return r
}

export function inverse3(m: Matrix): Matrix {
  const r = Object.assign(Array(9), { rows: 3 })

  r[0] = m[4] * m[8] - m[5] * m[7]
  r[1] = -m[1] * m[8] + m[2] * m[7]
  r[2] = m[1] * m[5] - m[2] * m[4]

  r[3] = -m[3] * m[8] + m[5] * m[6]
  r[4] = m[0] * m[8] - m[2] * m[6]
  r[5] = -m[0] * m[5] + m[2] * m[3]

  r[6] = m[3] * m[7] - m[4] * m[6]
  r[7] = -m[0] * m[7] + m[1] * m[6]
  r[8] = m[0] * m[4] - m[1] * m[3]

  const det = m[0] * r[0] + m[1] * r[3] + m[2] * r[6]
  let i = 9
  while (i--) {
    r[i] /= det
  }

  return r
}

export function inverse4(m: Matrix): Matrix {
  const r = Object.assign(Array(16), { rows: 4 })

  // first compute transposed cofactor matrix:
  // cofactor of an element is the determinant of the 3x3 matrix gained by removing the column and row belonging
  // to the element
  r[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[14] * m[11] -
    m[6] * m[9] * m[15] +
    (m[6] * m[13] * m[11] + m[7] * m[9] * m[14] - m[7] * m[13] * m[10])
  r[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[14] * m[11] +
    m[2] * m[9] * m[15] -
    (m[2] * m[13] * m[11] - m[3] * m[9] * m[14] + m[3] * m[13] * m[10])
  r[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[14] * m[7] -
    m[2] * m[5] * m[15] +
    (m[2] * m[13] * m[7] + m[3] * m[5] * m[14] - m[3] * m[13] * m[6])
  r[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[10] * m[7] +
    m[2] * m[5] * m[11] -
    (m[2] * m[9] * m[7] - m[3] * m[5] * m[10] + m[3] * m[9] * m[6])

  r[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[14] * m[11] +
    m[6] * m[8] * m[15] -
    (m[6] * m[12] * m[11] - m[7] * m[8] * m[14] + m[7] * m[12] * m[10])
  r[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[14] * m[11] -
    m[2] * m[8] * m[15] +
    (m[2] * m[12] * m[11] + m[3] * m[8] * m[14] - m[3] * m[12] * m[10])
  r[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[14] * m[7] +
    m[2] * m[4] * m[15] -
    (m[2] * m[12] * m[7] - m[3] * m[4] * m[14] + m[3] * m[12] * m[6])
  r[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[10] * m[7] -
    m[2] * m[4] * m[11] +
    (m[2] * m[8] * m[7] + m[3] * m[4] * m[10] - m[3] * m[8] * m[6])

  r[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[13] * m[11] -
    m[5] * m[8] * m[15] +
    (m[5] * m[12] * m[11] + m[7] * m[8] * m[13] - m[7] * m[12] * m[9])
  r[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[13] * m[11] +
    m[1] * m[8] * m[15] -
    (m[1] * m[12] * m[11] - m[3] * m[8] * m[13] + m[3] * m[12] * m[9])
  r[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[13] * m[7] -
    m[1] * m[4] * m[15] +
    (m[1] * m[12] * m[7] + m[3] * m[4] * m[13] - m[3] * m[12] * m[5])
  r[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[9] * m[7] +
    m[1] * m[4] * m[11] -
    (m[1] * m[8] * m[7] - m[3] * m[4] * m[9] + m[3] * m[8] * m[5])

  r[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[13] * m[10] +
    m[5] * m[8] * m[14] -
    (m[5] * m[12] * m[10] - m[6] * m[8] * m[13] + m[6] * m[12] * m[9])
  r[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[13] * m[10] -
    m[1] * m[8] * m[14] +
    (m[1] * m[12] * m[10] + m[2] * m[8] * m[13] - m[2] * m[12] * m[9])
  r[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[13] * m[6] +
    m[1] * m[4] * m[14] -
    (m[1] * m[12] * m[6] - m[2] * m[4] * m[13] + m[2] * m[12] * m[5])
  r[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[9] * m[6] -
    m[1] * m[4] * m[10] +
    (m[1] * m[8] * m[6] + m[2] * m[4] * m[9] - m[2] * m[8] * m[5])

  // calculate determinant using laplace expansion (cf https://en.wikipedia.org/wiki/Laplace_expansion),
  // as we already have the cofactors. We multiply a column by a row as the cofactor matrix is transposed.
  const det = m[0] * r[0] + m[1] * r[4] + m[2] * r[8] + m[3] * r[12]
  let i = 16
  while (i--) {
    r[i] /= det
  }
  return r
}
