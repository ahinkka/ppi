import proj4 from 'proj4'
proj4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')

export function convertCoordinate(productProjectionDescription, mapProjectionDescription) {
  const p = proj4(productProjectionDescription, mapProjectionDescription)
  return [p.forward, p.inverse]
}

export function transform(affineTransform, x, y) {
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

  return [
    affineTransform[0] + affineTransform[1] * x + affineTransform[2] * y,
    affineTransform[3] + affineTransform[4] * x + affineTransform[5] * y
  ]
}

export function productExtent(affineTransform, width, height) {
  const origin = [affineTransform[0], affineTransform[3]]
  const extreme = transform(affineTransform, width, height)
  return [
    Math.min(origin[0], extreme[0]),
    Math.min(origin[1], extreme[1]),
    Math.max(origin[0], extreme[0]),
    Math.max(origin[1], extreme[1])
  ]
}

function lerp(a, b, f) {
  return (a * (1.0 - f)) + (b * f)
}

function canvasPxToMapCoords(canvasWidth, canvasHeight, xMin, xMax, yMin, yMax, x, y) {
  const propX = x / canvasWidth
  const propY = 1 - y / canvasHeight
  const mapX = lerp(xMin, xMax, propX)
  const mapY = lerp(yMin, yMax, propY)
  return [mapX, mapY]
}

function getWgs84Conversion(reprojectionCache, productProjectionDescription) {
  const [pToWgs84, wgs84ToP] = reprojectionCache.wgs84ToP ?
    [reprojectionCache.pToWgs84, reprojectionCache.wgs84ToP] :
    convertCoordinate(productProjectionDescription, 'EPSG:4326')

  reprojectionCache.pToWgs84 = pToWgs84
  reprojectionCache.wgs84ToP = wgs84ToP

  return [pToWgs84, wgs84ToP]
}

function getProductCoordinateConversion(
  reprojectionCache,
  productProjectionDescription,
  canvasProjectionDescription
) {
  const [pToM, mToP] = reprojectionCache.pToM ?
    [reprojectionCache.pToM, reprojectionCache.mToP] :
    convertCoordinate(productProjectionDescription, canvasProjectionDescription)
  reprojectionCache.pToM = pToM
  reprojectionCache.mToP = mToP

  return [pToM, mToP]
}

export function canvasPxToProductPx(
  reprojectionCache,
  productProjectionDescription,
  affineTransform,
  productWidth, productHeight,
  canvasProjectionDescription,
  canvasExtent,
  canvasWidth, canvasHeight,
  x, y
) {
  const productExtent_ = reprojectionCache.productExtent ? reprojectionCache.productExtent :
    productExtent(affineTransform, productWidth, productHeight)
  reprojectionCache.productExtent = productExtent_

  const [, mToP] = getProductCoordinateConversion(reprojectionCache, productProjectionDescription, canvasProjectionDescription)

  const canvasXY = canvasPxToMapCoords(
    canvasWidth, canvasHeight,
    canvasExtent[0], canvasExtent[2],
    canvasExtent[1], canvasExtent[3],
    x, y
  )
  const productXY = mToP(canvasXY)

  if (productXY[0] < productExtent_[0] || productXY[1] < productExtent_[1] ||
      productXY[0] > productExtent_[2] || productXY[1] > productExtent_[3]) {
    return [-1, -1]
  }

  const propX = (productXY[0] - productExtent_[0]) / (productExtent_[2] - productExtent_[0])
  const propY = 1 - (productXY[1] - productExtent_[1]) / (productExtent_[3] - productExtent_[1])
  return [Math.floor(propX * productWidth), Math.floor(propY * productHeight)]
}

export function wgs84ToProductPx(
  reprojectionCache,
  productProjectionDescription,
  affineTransform,
  productWidth, productHeight,
  lon, lat
) {
  const [, wgs84ToP] = getWgs84Conversion(reprojectionCache, productProjectionDescription)
  const productXY = wgs84ToP([lon, lat])

  const productExtent_ = productExtent(affineTransform, productWidth, productHeight)
  if (productXY[0] < productExtent_[0] || productXY[1] < productExtent_[1] ||
      productXY[0] > productExtent_[2] || productXY[1] > productExtent_[3]) {
    return [-1, -1]
  }

  const propX = (productXY[0] - productExtent_[0]) / (productExtent_[2] - productExtent_[0])
  const propY = 1 - (productXY[1] - productExtent_[1]) / (productExtent_[3] - productExtent_[1])
  const pxX = Math.floor(propX * productWidth)
  const pxY = Math.floor(propY * productHeight)
  return [pxX, pxY]
}
