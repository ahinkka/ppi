import { twoDtoUint8Array } from '../src/utils'

describe('Should convert 2d int array into a typed array', () => {
  test('in happy case', () => {
    let data = [[1, 2, 3], [4, 5, 6]]
    let [cols, rows, buffer] = twoDtoUint8Array(data)
    let view = new Uint8Array(buffer)
    expect(view[0 * rows + 2]).toEqual(data[0][2])
    expect(view[1 * rows + 1]).toEqual(data[1][1])
  })
})
