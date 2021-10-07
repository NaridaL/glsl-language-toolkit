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

export function determinant2(m: Matrix): number {
  return m[0] * m[3] - m[2] * m[1]
}

export function inverse3(m: Matrix): Matrix {
  const r = Object.assign(Array(9), { rows: 3 })

  r[0] = m[4] * m[8] - m[7] * m[5]
  r[1] = -m[1] * m[8] + m[7] * m[2]
  r[2] = m[1] * m[5] - m[4] * m[2]

  r[3] = -m[3] * m[8] + m[6] * m[5]
  r[4] = m[0] * m[8] - m[6] * m[2]
  r[5] = -m[0] * m[5] + m[3] * m[2]

  r[6] = m[3] * m[7] - m[6] * m[4]
  r[7] = -m[0] * m[7] + m[6] * m[1]
  r[8] = m[0] * m[4] - m[3] * m[1]

  const det = m[0] * r[0] + m[3] * r[1] + m[6] * r[2]
  let i = 9
  while (i--) {
    r[i] /= det
  }

  return r
}

export function determinant3(m: Matrix): number {
  return (
    m[0] * m[4] * m[8] -
    m[0] * m[7] * m[5] +
    (m[3] * -m[1] * m[8] + m[3] * m[7] * m[2]) +
    (m[6] * m[1] * m[5] - m[6] * m[4] * m[2])
  )
}

export function inverse4(m: Matrix): Matrix {
  const r = Object.assign(Array(16), { rows: 4 })

  // first compute transposed cofactor matrix:
  // cofactor of an element is the determinant of the 3x3 matrix gained by removing the column and row belonging
  // to the element
  r[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] +
    (-m[9] * m[6] * m[15] + m[9] * m[7] * m[14]) +
    (m[13] * m[6] * m[11] + -m[13] * m[7] * m[10])
  r[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[11] * m[14] +
    (m[8] * m[6] * m[15] - m[8] * m[7] * m[14]) +
    (-m[12] * m[6] * m[11] + m[12] * m[7] * m[10])
  r[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[11] * m[13] +
    (-m[8] * m[5] * m[15] + m[8] * m[7] * m[13]) +
    (m[12] * m[5] * m[11] - m[12] * m[7] * m[9])
  r[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[10] * m[13] +
    (m[8] * m[5] * m[14] - m[8] * m[6] * m[13]) +
    (-m[12] * m[5] * m[10] + m[12] * m[6] * m[9])

  r[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] -
    m[13] * m[2] * m[11] +
    m[13] * m[3] * m[10]
  r[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[11] * m[14] -
    m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] +
    m[12] * m[2] * m[11] -
    m[12] * m[3] * m[10]
  r[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[11] * m[13] +
    m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] -
    m[12] * m[1] * m[11] +
    m[12] * m[3] * m[9]
  r[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[10] * m[13] -
    m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] +
    m[12] * m[1] * m[10] -
    m[12] * m[2] * m[9]

  r[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] -
    m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] +
    m[13] * m[2] * m[7] -
    m[13] * m[3] * m[6]
  r[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[7] * m[14] +
    m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] -
    m[12] * m[2] * m[7] +
    m[12] * m[3] * m[6]
  r[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[7] * m[13] -
    m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] +
    m[12] * m[1] * m[7] -
    m[12] * m[3] * m[5]
  r[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[6] * m[13] +
    m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] -
    m[12] * m[1] * m[6] +
    m[12] * m[2] * m[5]

  r[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] -
    m[9] * m[2] * m[7] +
    m[9] * m[3] * m[6]
  r[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[7] * m[10] -
    m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] +
    m[8] * m[2] * m[7] -
    m[8] * m[3] * m[6]
  r[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[7] * m[9] +
    m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] -
    m[8] * m[1] * m[7] +
    m[8] * m[3] * m[5]
  r[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[6] * m[9] -
    m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] +
    m[8] * m[1] * m[6] -
    m[8] * m[2] * m[5]

  // calculate determinant using laplace expansion (cf https://en.wikipedia.org/wiki/Laplace_expansion),
  // as we already have the cofactors. We multiply a column by a row as the cofactor matrix is transposed.
  const det = m[0] * r[0] + m[4] * r[1] + m[8] * r[2] + m[12] * r[3]
  let i = 16
  while (i--) {
    r[i] /= det
  }
  return r
}

export function determinant4(m: Matrix): number {
  // first compute transposed cofactor matrix:
  // cofactor of an element is the determinant of the 3x3 matrix gained by removing the column and row belonging
  // to the element
  const r0 =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] +
    (-m[9] * m[6] * m[15] + m[9] * m[7] * m[14]) +
    (m[13] * m[6] * m[11] + -m[13] * m[7] * m[10])

  const r1 =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    (m[9] * m[2] * m[15] - m[9] * m[3] * m[14]) +
    (-m[13] * m[2] * m[11] + m[13] * m[3] * m[10])

  const r2 =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] +
    (-m[5] * m[2] * m[15] + m[5] * m[3] * m[14]) +
    (m[13] * m[2] * m[7] - m[13] * m[3] * m[6])

  const r3 =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    (m[5] * m[2] * m[11] - m[5] * m[3] * m[10]) +
    (-m[9] * m[2] * m[7] + m[9] * m[3] * m[6])

  return m[0] * r0 + m[4] * r1 + m[8] * r2 + m[12] * r3
}
