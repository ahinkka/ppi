import { productToMap } from '../src/reprojection'

describe('Reprojection', () => {
  test('should project individual coordinates to and from', () => {
    const [pToM, mToP] = productToMap('EPSG:3067', 'EPSG:3857')
    expect(pToM([372150, 7313985])[0]).toBeCloseTo(2692930.1, 1)
    expect(pToM([372150, 7313985])[1]).toBeCloseTo(9855302.9, 1)

    expect(mToP(pToM([372150, 7313985]))[0]).toBeCloseTo(372150, 1)
    expect(mToP(pToM([372150, 7313985]))[1]).toBeCloseTo(7313985, 1)
  })
})
