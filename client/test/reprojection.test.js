import { productToMap } from '../src/reprojection'

describe('Reprojection', () => {
  test('should project individual coordinates to and from', () => {
    const [pToM, mToP] = productToMap('EPSG:3067', 'EPSG:3857')
    expect(pToM([372150, 7313985])[0]).toBeCloseTo(2692930.1, 1)
    expect(pToM([372150, 7313985])[1]).toBeCloseTo(9855302.9, 1)

    expect(mToP(pToM([372150, 7313985]))[0]).toBeCloseTo(372150, 1)
    expect(mToP(pToM([372150, 7313985]))[1]).toBeCloseTo(7313985, 1)
  })

  test('should support a real product projectionRef', () => {
    const ref = 'PROJCS[\"UTM Zone 35, Northern Hemisphere\",GEOGCS[\"GRS 1980(IUGG, 1980)\",DATUM[\"unknown\",SPHEROID[\"GRS80\",6378137,298.257222101]],PRIMEM[\"Greenwich\",0],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]]],PROJECTION[\"Transverse_Mercator\"],PARAMETER[\"latitude_of_origin\",0],PARAMETER[\"central_meridian\",27],PARAMETER[\"scale_factor\",0.9996],PARAMETER[\"false_easting\",500000],PARAMETER[\"false_northing\",0],UNIT[\"metre\",1,AUTHORITY[\"EPSG\",\"9001\"]],AXIS[\"Easting\",EAST],AXIS[\"Northing\",NORTH]]'
    const [pToM, mToP] = productToMap(ref, 'EPSG:4326')
    expect(mToP([25, 65])[0]).toBeCloseTo(405698.98, 1)
    expect(mToP([25, 65])[1]).toBeCloseTo(7209946.44, 1)
  })
})
