/**
 * Takes a string (normally glsl, but could be anything), and replaces "'" with " ",
 * returning the positions they were at.
 */
export function getMarkerPositions(
  s: string,
): [newS: string, positions: { start: number; end: number }[]] {
  const positions: { start: number; end: number }[] = []
  s = s.replace(
    /`(.*?)`|\[\[(.*?)]]|'(.*?)'/g,
    (
      _,
      m0: string | undefined,
      m1: string | undefined,
      m2: string | undefined,
      offset,
    ) => {
      const str = (m0 ?? m1 ?? m2)!
      positions.push({ start: offset + 1, end: offset + str.length + 1 })
      return " " + str + " " // add spaces so indexes don't change
    },
  )
  return [s, positions]
}

export * from "./dedent"
