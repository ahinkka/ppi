export function twoDtoUint8Array(input: number[][]): [number, number, Uint8Array] {
  const dim1 = input.length
  const dim2 = input[0].length

  const buffer = new ArrayBuffer(dim1 * dim2)
  const view = new Uint8Array(buffer)
  for (let i=0; i < dim1; i++) {
    for (let j=0; j < dim2; j++) {
      const viewIndex = i * dim2 + j
      view[viewIndex] = input[i][j]
    }
  }

  return [dim1, dim2, view]
}
