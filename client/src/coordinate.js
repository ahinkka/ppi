const lerp = (a, b, f) => (a * (1.0 - f)) + (b * f)
const _canvasPxToMapCoords = (canvasWidth, canvasHeight, xMin, xMax, yMin, yMax, x, y) => {
  const propX = x / canvasWidth
  const propY = 1 - y / canvasHeight
  const mapX = lerp(xMin, xMax, propX)
  const mapY = lerp(yMin, yMax, propY)
  return [mapX, mapY]
}


// Currently we expect the products to be in EPSG:4326 and the map in
// EPSG:3857.  We should support arbitrary input projections. And we also
// expect to work with positive Web Mercator coordinates...
export const mapCoordsToProductPx = (
  productMapCoordsExtent, productMapCoordsWidth, productMapCoordsHeight,
  productPixWidth, productPixHeight,
  x, y
) => {
  if (x < productMapCoordsExtent[0] || x > productMapCoordsExtent[2] ||
      y < productMapCoordsExtent[1] || y > productMapCoordsExtent[3]) {
    return [-1, -1]
  }
  const propX = (x - productMapCoordsExtent[0]) / productMapCoordsWidth
  const propY = 1 - (y - productMapCoordsExtent[1]) / productMapCoordsHeight
  const pxX = Math.floor(propX * productPixWidth)
  const pxY = Math.floor(propY * productPixHeight)
  return [pxX, pxY]
}


export const toMapCoordsExtent = (fromLonLat, wgs84Extent) => {
  const minLonLat = [wgs84Extent[0], wgs84Extent[1]]
  const maxLonLat = [wgs84Extent[2], wgs84Extent[3]]
  const min = fromLonLat(minLonLat)
  const max = fromLonLat(maxLonLat)
  return [min[0], min[1], max[0], max[1]]
}


export const canvasPxToProductPx = (
  productAffineTransform, productWidth, productHeight, productExtent,
  mapCoordsWidth, mapCoordsHeight,
  canvasExtent, canvasWidth, canvasHeight,
  x, y
) => {
  const mapCoordsXY = _canvasPxToMapCoords(
    canvasWidth, canvasHeight,
    canvasExtent[0], canvasExtent[2],
    canvasExtent[1], canvasExtent[3],
    x, y
  )
  const dataPxXY = mapCoordsToProductPx(
    productExtent,
    mapCoordsWidth, mapCoordsHeight,
    productWidth, productHeight,
    mapCoordsXY[0], mapCoordsXY[1]
  )
  return dataPxXY
}
