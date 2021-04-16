import proj4 from 'proj4'
proj4.defs("EPSG:3067","+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")

export const convertCoordinate = (productProjectionDescription, mapProjectionDescription) => {
  const p = proj4(productProjectionDescription, mapProjectionDescription)
  return [p.forward, p.inverse]
}

export const productExtent = (affineTransform, width, height) => {
  // "affineTransform": [
  // 0   19.8869934197,              // X origin
  // 1   0.009449604183593748,       //  width (typically main) coef for calculating X offset
  // 2   0.0,                        //  height coef for calculating X offset
  // 3   62.5293188598,              // Y origin
  // 4   0.0,                        //  width coef for calculating Y offset
  // 5   -0.0045287129015625024      //  height (typically main) coef for calculating Y offset
  // ]

  // http://openev.sourceforge.net/app/developer_info/COURSE1_gdal_datamodel.html
  // Xgeo = GT(0) + Xpixel*GT(1) + Yline*GT(2)
  // Ygeo = GT(3) + Xpixel*GT(4) + Yline*GT(5)

  const origin = [affineTransform[0], affineTransform[3]]
  const extreme = [
    origin[0] + affineTransform[1] * width + affineTransform[2] * height,
    origin[1] + affineTransform[4] * width + affineTransform[5] * height
  ]
  return [
    Math.min(origin[0], extreme[0]),
    Math.min(origin[1], extreme[1]),
    Math.max(origin[0], extreme[0]),
    Math.max(origin[1], extreme[1])
  ]
}
