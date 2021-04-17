import {
  findClosestIndex,
  convertCoordinate,
  productExtent,
  getLutConversion
} from '../src/reprojection'

describe('Coordinate system conversions', () => {
  test('should project individual coordinates to and from', () => {
    const [pToM, mToP] = convertCoordinate('EPSG:3067', 'EPSG:3857')
    expect(pToM([372150, 7313985])[0]).toBeCloseTo(2692930.1, 1)
    expect(pToM([372150, 7313985])[1]).toBeCloseTo(9855302.9, 1)

    expect(mToP(pToM([372150, 7313985]))[0]).toBeCloseTo(372150, 1)
    expect(mToP(pToM([372150, 7313985]))[1]).toBeCloseTo(7313985, 1)
  })

  test('should support a real product projectionRef', () => {
    const ref = 'PROJCS[\"UTM Zone 35, Northern Hemisphere\",GEOGCS[\"GRS 1980(IUGG, 1980)\",DATUM[\"unknown\",SPHEROID[\"GRS80\",6378137,298.257222101]],PRIMEM[\"Greenwich\",0],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]]],PROJECTION[\"Transverse_Mercator\"],PARAMETER[\"latitude_of_origin\",0],PARAMETER[\"central_meridian\",27],PARAMETER[\"scale_factor\",0.9996],PARAMETER[\"false_easting\",500000],PARAMETER[\"false_northing\",0],UNIT[\"metre\",1,AUTHORITY[\"EPSG\",\"9001\"]],AXIS[\"Easting\",EAST],AXIS[\"Northing\",NORTH]]'
    const [pToM, mToP] = convertCoordinate(ref, 'EPSG:4326')
    expect(mToP([25, 65])[0]).toBeCloseTo(405698.98, 1)
    expect(mToP([25, 65])[1]).toBeCloseTo(7209946.44, 1)
  })
})

describe('Extent computation', () => {
  test('should produce valid extent from affine transform, width and height', () => {
    const affineTransform = [
      19.8869934197,
      0.009449604183593748,
      0.0,
      62.5293188598,
      0.0,
      -0.0045287129015625024
    ]

    expect(productExtent(affineTransform, 200, 200)[0]).toBeCloseTo(19.88, 1)
    expect(productExtent(affineTransform, 200, 200)[1]).toBeCloseTo(61.62, 1)
    expect(productExtent(affineTransform, 200, 200)[2]).toBeCloseTo(21.77, 1)
    expect(productExtent(affineTransform, 200, 200)[3]).toBeCloseTo(62.52, 1)
  })
})

describe('Closest index', () => {
  test('should find the closest index item', () => {
    const xs = [1, 2, 4, 8, 12, 33, 100, 102]
    expect(findClosestIndex(xs, 12)).toEqual(4)
    expect(findClosestIndex(xs, 2.5)).toEqual(1)
    expect(findClosestIndex(xs, 100)).toEqual(6)
  })
})

describe('LUT', () => {
  test('should work', () => {
    // getLutConversion(reprojectionCache, productExtent, pToWgs84, wgs84ToM, mToP) {
    const [pToM, mToP] = convertCoordinate('EPSG:4326', 'EPSG:3857')
    const pToWgs84 = (c) => c
    const c = getLutConversion({}, [60, 20, 65, 25], pToWgs84, pToM, mToP)
    const [mapX, mapY] = pToM([62.5, 22.5])
    expect(c([mapX, mapY])[0]).toBeCloseTo(62.5)
    expect(c([mapX, mapY])[1]).toBeCloseTo(22.5)
  })
})
