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

function getConversion(reprojectionCache, cacheKey, fromProjection, toProjection) {
  const forwardKey = cacheKey + '-forward'
  const inverseKey = cacheKey + '-inverse'

  if (!reprojectionCache.hasOwnProperty(forwardKey)) {
    const [forward, inverse] = convertCoordinate(fromProjection, toProjection)
    reprojectionCache[forwardKey] = forward
    reprojectionCache[inverseKey] = inverse
  }

  return [reprojectionCache[forwardKey], reprojectionCache[inverseKey]]
}

function convertExtent(extent, conversionFunction) {
  const origCoordMin = [extent[0], extent[1]]
  const origCoordMax = [extent[2], extent[3]]
  const [coordA, coordB] = [
    conversionFunction(origCoordMin),
    conversionFunction(origCoordMax)
  ]

  return [
    Math.min(coordA[0], coordB[0]), Math.min(coordA[1], coordB[1]),
    Math.max(coordA[0], coordB[0]), Math.max(coordA[1], coordB[1])
  ]
}

export function findClosestIndex(arr, target) {
  let start = 0
  let end = arr.length - 1

  let smallestDifference = Number.MAX_VALUE
  let smallestDifferenceIndex = -1

  while (start <= end) {
    let mid = Math.floor((start + end) / 2)
    const currentDifference = Math.abs(target - arr[mid])
    // console.log({start, mid, end, smallestDifference, currentDifference})

    if (arr[mid] == target) {
      return mid
    } else if (arr[mid] < target) {
      start = mid + 1
    } else {
      end = mid - 1
    }

    if (currentDifference < smallestDifference) {
      smallestDifference = currentDifference
      smallestDifferenceIndex = mid
    }
  }

  return smallestDifferenceIndex
}

const inSortedOrder = (a, b) => [Math.min(a, b), Math.max(a, b)]

export function getLutConversion(reprojectionCache, productExtent, pToWgs84, wgs84ToM, mToP) {
  if (reprojectionCache.hasOwnProperty('lutConversion')) {
    return reprojectionCache.lutConversion
  }

  const wgs84Extent = convertExtent(productExtent, pToWgs84)
  const xDegrees = wgs84Extent[2] - wgs84Extent[0]
  const yDegrees = wgs84Extent[3] - wgs84Extent[1]

  const xStepCount = Math.max(3, Math.floor(xDegrees) / 2)
  const yStepCount = Math.max(3, Math.floor(yDegrees) / 2)
  const xStepSize = xDegrees / xStepCount
  const yStepSize = yDegrees / yStepCount
  const xSteps = new Float32Array(xStepCount)
  const ySteps = new Float32Array(yStepCount)

  let xi = 0
  for (let i=wgs84Extent[0]; i <= wgs84Extent[2]; i+=xStepSize) {
    xSteps[xi] = i
    xi++
  }

  let yi = 0
  for (let i=wgs84Extent[1]; i <= wgs84Extent[3]; i+=yStepSize) {
    ySteps[yi] = i
    yi++
  }

  const mapXs = new Float32Array(xSteps.length)
  const mapYs = new Float32Array(ySteps.length)
  const productXs = new Float32Array(xSteps.length)
  const productYs = new Float32Array(ySteps.length)
  for (let i=0; i<xSteps.length; i++) {
    for (let j=0; j<ySteps.length; j++) {
      const xy = [xSteps[i], ySteps[j]]

      let xyM, xyP
      try {
	xyM = wgs84ToM(xy)
	mapXs[i] = xyM[0]
	mapYs[j] = xyM[1]
	xyP = mToP(xyM)
	productXs[i] = xyP[0]
	productYs[j] = xyP[1]
      } catch (error) {
	console.log(error)
	console.log(xy, xyM, xyP)
      }
    }
  }

  reprojectionCache.lutConversion = (coord) => {
    const [x, y] = coord
    const nearestXIdx = findClosestIndex(mapXs, x)
    const nearestYIdx = findClosestIndex(mapYs, y)

    const secondNearestXIdx = (mapXs[nearestXIdx] < x) ? nearestXIdx + 1 : nearestXIdx - 1
    const secondNearestYIdx = (mapYs[nearestYIdx] < y) ? nearestYIdx + 1 : nearestYIdx - 1

    // console.log({x, y, nearestXIdx, nearestYIdx, secondNearestXIdx, secondNearestYIdx, productXs, productYs, mapXs, mapYs})

    const [x0, x1] = inSortedOrder(mapXs[nearestXIdx], mapXs[secondNearestXIdx])
    const [y0, y1] = inSortedOrder(mapYs[nearestYIdx], mapYs[secondNearestYIdx])

    // console.log({x0, x1, y0, y1})

    const propX = (x - x0) / (x1 - x0)
    const propY = (y - y0) / (y1 - y0)

    // console.log({propX, propY})

    const [pX0, pX1] = inSortedOrder(productXs[nearestXIdx], productXs[secondNearestXIdx])
    const [pY0, pY1] = inSortedOrder(productYs[nearestYIdx], productYs[secondNearestYIdx])
    return [lerp(pX0, pX1, propX), lerp(pY0, pY1, propY)]
  }

  return reprojectionCache.lutConversion
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

  const [, mToP] = getConversion(reprojectionCache, 'p-m', productProjectionDescription, canvasProjectionDescription)

  const [wgs84ToM,] = getConversion(reprojectionCache, 'wgs84-m', 'EPSG:4326', 'EPSG:3857')
  const [pToWgs84,] = getConversion(reprojectionCache, 'p-wgs84', productProjectionDescription, 'EPSG:4326')
  const mToPLut = getLutConversion(reprojectionCache, productExtent_, pToWgs84, wgs84ToM, mToP)

  const canvasXY = canvasPxToMapCoords(
    canvasWidth, canvasHeight,
    canvasExtent[0], canvasExtent[2],
    canvasExtent[1], canvasExtent[3],
    x, y
  )
  const productXY = mToPLut(canvasXY)
  // const productXY = mToP(canvasXY)

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
  const [,wgs84ToP] = getConversion(reprojectionCache, 'p-wgs84', productProjectionDescription, 'EPSG:4326')
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
