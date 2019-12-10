const lerp = (a, b, f) => (a * (1.0 - f)) + (b * f)
const _canvasPxToMapCoords = (canvasWidth, canvasHeight, xMin, xMax, yMin, yMax, x, y) => {
  const propX = x / canvasWidth
  const propY = 1 - y / canvasHeight
  const mapX = lerp(xMin, xMax, propX)
  const mapY = lerp(yMin, yMax, propY)
  return [mapX, mapY]
}


// Currently we expect the products to be in EPSG:3426 and the map in
// EPSG:3857.  We should support arbitrary input projections. And we also
// expect to work with positive Web Mercator coordinates...
const _mapCoordsToProductPx = (
  productMapCoordsExtent, productMapCoordsWidth, productMapCoordsHeight,
  productPixWidth, productPixHeight,
  x, y
) => {
  if (x < productMapCoordsExtent[0] || x > productMapCoordsExtent[2] ||
      y < productMapCoordsExtent[1] || y > productMapCoordsExtent[3]) {
    return [-1, -1]
  }
  let propX = (x - productMapCoordsExtent[0]) / productMapCoordsWidth
  let propY = 1 - (y - productMapCoordsExtent[1]) / productMapCoordsHeight
  let pxX = Math.floor(propX * productPixWidth)
  let pxY = Math.floor(propY * productPixHeight)
  return [pxX, pxY]
}


export const computeExtent = (affineTransform, width, height) => {
  // "affineTransform": [
  // 0   19.8869934197,
  // 1   0.009449604183593748,
  // 2   0.0,
  // 3   62.5293188598,
  // 4   0.0,
  // 5   -0.0045287129015625024

  // Xgeo = GT(0) + Xpixel*GT(1) + Yline*GT(2)
  // Ygeo = GT(3) + Xpixel*GT(4) + Yline*GT(5)

  let origin = [affineTransform[0], affineTransform[3]]
  let extreme = [
    origin[0] + affineTransform[1] * width,
    origin[1] + affineTransform[5] * height
  ]
  // extent = [minX, minY, maxX, maxY]
  return [
    Math.min(origin[0], extreme[0]),
    Math.min(origin[1], extreme[1]),
    Math.max(origin[0], extreme[0]),
    Math.max(origin[1], extreme[1])
  ]
}


export const toMapCoordsExtent = (fromLonLat, wgs84Extent) => {
  let minLonLat = [wgs84Extent[0], wgs84Extent[1]]
  let maxLonLat = [wgs84Extent[2], wgs84Extent[3]]
  let min = fromLonLat(minLonLat)
  let max = fromLonLat(maxLonLat)
  return  [min[0], min[1], max[0], max[1]]
}


export const canvasPxToProductPx = (
  productAffineTransform, productWidth, productHeight, productExtent,
  mapCoordsWidth, mapCoordsHeight,
  canvasExtent, canvasWidth, canvasHeight,
  x, y
) => {
  let mapCoordsXY = _canvasPxToMapCoords(
    canvasWidth, canvasHeight,
    canvasExtent[0], canvasExtent[2],
    canvasExtent[1], canvasExtent[3],
    x, y
  )
  let dataPxXY = _mapCoordsToProductPx(
    productExtent,
    mapCoordsWidth, mapCoordsHeight,
    productWidth, productHeight,
    mapCoordsXY[0], mapCoordsXY[1]
  )
  return dataPxXY
}
