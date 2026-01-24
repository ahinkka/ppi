import proj4 from 'proj4'
proj4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')

export type AffineTransform = [number, number, number, number, number, number]

export type Extent = [number, number, number, number]

type ConversionFunction = (coord: [number, number]) => [number, number]

export function convertCoordinate(productProjDef: string, mapProjDef: string) {
  const p = proj4(productProjDef, mapProjDef)
  return [p.forward, p.inverse]
}


export function transform(affineTransform: AffineTransform, x: number, y: number) {
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

export function productExtent(
  affineTransform: AffineTransform,
  width: number,
  height: number
): Extent {
  const topLeftCenter = transform(affineTransform, 0.5, 0.5)
  const bottomRightCenter = transform(affineTransform, width - 0.5, height - 0.5)
  return [
    Math.min(topLeftCenter[0], bottomRightCenter[0]),
    Math.min(topLeftCenter[1], bottomRightCenter[1]),
    Math.max(topLeftCenter[0], bottomRightCenter[0]),
    Math.max(topLeftCenter[1], bottomRightCenter[1])
  ]
}

function lerp(a: number, b: number, f: number): number {
  return (a * (1.0 - f)) + (b * f)
}

function canvasPxToMapCoords(canvasWidth: number, canvasHeight: number,
			     xMin: number, xMax: number,
			     yMin: number, yMax:number,
			     x: number, y: number): [number, number] {
  const propX = x / canvasWidth
  const propY = 1 - y / canvasHeight
  const mapX = lerp(xMin, xMax, propX)
  const mapY = lerp(yMin, yMax, propY)
  return [mapX, mapY]
}

function convertExtent(extent: Extent, conversionFunction: ConversionFunction) {
  const origCoordMin = [extent[0], extent[1]] as [number, number]
  const origCoordMax = [extent[2], extent[3]] as [number, number]
  const [coordA, coordB] = [
    conversionFunction(origCoordMin),
    conversionFunction(origCoordMax)
  ]

  return [
    Math.min(coordA[0], coordB[0]), Math.min(coordA[1], coordB[1]),
    Math.max(coordA[0], coordB[0]), Math.max(coordA[1], coordB[1])
  ]
}

export function findClosestIndex(arr: Float32Array, target: number) {
  let start = 0
  let end = arr.length - 1

  let smallestDifference = Number.MAX_VALUE
  let smallestDifferenceIndex = -1

  while (start <= end) {
    const mid = Math.floor((start + end) / 2)
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

const inSortedOrder = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)]

export function convertCoordinateWithLut(
  productExtent: Extent,
  pToWgs84: ConversionFunction,
  wgs84ToM: ConversionFunction,
  mToP: ConversionFunction
) {
  const wgs84Extent = convertExtent(productExtent, pToWgs84)
  const xDegrees = wgs84Extent[2] - wgs84Extent[0]
  const yDegrees = wgs84Extent[3] - wgs84Extent[1]

  // These counts + 2, in reality
  const xStepCount = Math.max(3, Math.floor(xDegrees) / 2)
  // Use finer Y step resolution to avoid vertical interpolation errors
  const yStepCount = Math.max(3, Math.floor(yDegrees * 4))
  const xStepSize = xDegrees / xStepCount
  const yStepSize = yDegrees / yStepCount
  const xSteps = new Float32Array(xStepCount + 2)
  const ySteps = new Float32Array(yStepCount + 2)

  xSteps[0] = wgs84Extent[0] - 0.1
  xSteps[xSteps.length - 1] = wgs84Extent[2] + 0.1
  for (let i=0; i<xStepCount; i++) {
    const base = wgs84Extent[0] - xStepSize * 0.5
    xSteps[i + 1] = base + (i + 1) * xStepSize
  }

  ySteps[0] = wgs84Extent[1] - 0.1
  ySteps[ySteps.length - 1] = wgs84Extent[3] + 0.1
  for (let i=0; i<yStepCount; i++) {
    const base = wgs84Extent[1] - yStepSize * 0.5
    ySteps[i + 1] = base + (i + 1) * yStepSize
  }

  const mapXs = new Float32Array(xSteps.length)
  const mapYs = new Float32Array(ySteps.length)
  const productXs = new Float32Array(xSteps.length)
  const productYs = new Float32Array(ySteps.length)
  for (let i=0; i<xSteps.length; i++) {
    for (let j=0; j<ySteps.length; j++) {
      const xy = [xSteps[i], ySteps[j]] as [number, number]
      let xyM: [number, number] | null, xyP: [number, number] | null

      try {
        xyM = wgs84ToM(xy)
        mapXs[i] = xyM[0]
        mapYs[j] = xyM[1]
        xyP = mToP(xyM)
        productXs[i] = xyP[0]
        productYs[j] = xyP[1]
      } catch {
        // console.log(error)
        // console.log({xy, xyM, xyP})
      }
    }
  }

  // Returns NaNs when the pixel isn't inside the LUT (and hence outside the product's extent)
  return (coord: [number, number]) => {
    const [x, y] = coord

    const nearestXIdx = findClosestIndex(mapXs, x)
    const nearestYIdx = findClosestIndex(mapYs, y)

    const secondNearestXIdx = (mapXs[nearestXIdx] < x) ? nearestXIdx + 1 : nearestXIdx - 1
    const secondNearestYIdx = (mapYs[nearestYIdx] < y) ? nearestYIdx + 1 : nearestYIdx - 1

    const [x0, x1] = inSortedOrder(mapXs[nearestXIdx], mapXs[secondNearestXIdx])
    const [y0, y1] = inSortedOrder(mapYs[nearestYIdx], mapYs[secondNearestYIdx])

    const propX = (x - x0) / (x1 - x0)
    const propY = (y - y0) / (y1 - y0)

    const [pX0, pX1] = inSortedOrder(productXs[nearestXIdx], productXs[secondNearestXIdx])
    const [pY0, pY1] = inSortedOrder(productYs[nearestYIdx], productYs[secondNearestYIdx])

    return [lerp(pX0, pX1, propX), lerp(pY0, pY1, propY)]
  }
}

export function canvasPxToProductPx(
  productProjectionDescription: string,
  affineTransform: AffineTransform,
  productWidth: number, productHeight: number,
  canvasProjectionDescription: string,
  canvasExtent: Extent,
  canvasWidth: number, canvasHeight: number,
): (x: number, y: number) => [number, number] {
  const productExtent_ = productExtent(affineTransform, productWidth, productHeight)
  const [, mToP] = convertCoordinate(productProjectionDescription, canvasProjectionDescription)
  const [wgs84ToM,] = convertCoordinate('EPSG:4326', 'EPSG:3857')
  const [pToWgs84,] = convertCoordinate(productProjectionDescription, 'EPSG:4326')
  const mToPLut = convertCoordinateWithLut(productExtent_, pToWgs84, wgs84ToM, mToP)

  return (x: number, y: number) => {
    const canvasXY = canvasPxToMapCoords(
      canvasWidth, canvasHeight,
      canvasExtent[0], canvasExtent[2],
      canvasExtent[1], canvasExtent[3],
      x, y
    )
    // console.log({x, y, canvasXY, canvasExtent})
    const productXY = mToPLut(canvasXY)
    // const productXY = mToP(canvasXY)

    if (isNaN(productXY[0]) || isNaN(productXY[1]) ||
	productXY[0] < productExtent_[0] || productXY[1] < productExtent_[1] ||
        productXY[0] > productExtent_[2] || productXY[1] > productExtent_[3]) {
      return [-1, -1]
    }

    const propX = (productXY[0] - productExtent_[0]) / (productExtent_[2] - productExtent_[0])
    const propY = 1 - (productXY[1] - productExtent_[1]) / (productExtent_[3] - productExtent_[1])
    // With pixel centers: extent bounds are the geographic positions of the outermost pixel centers.
    // For width pixels (indices 0 to width-1), centers span from 0.5 to width-0.5.
    // So propX=0 maps to pixel 0, propX=1 maps to pixel (width-1).
    return [Math.round(propX * (productWidth - 1)), Math.round(propY * (productHeight - 1))]
  }
}

export function wgs84ToProductPx(
  productProjectionDescription: string,
  affineTransform: AffineTransform,
  productWidth: number, productHeight: number
): (lon: number, lat: number) => [number, number] {
  const [, wgs84ToP] = convertCoordinate(productProjectionDescription, 'EPSG:4326')

  return (lon: number, lat: number) => {
    const productXY = wgs84ToP([lon, lat])

    const productExtent_ = convertExtent(
      productExtent(affineTransform, productWidth, productHeight),
      wgs84ToP
    )

    if (productXY[0] < productExtent_[0] || productXY[1] < productExtent_[1] ||
        productXY[0] > productExtent_[2] || productXY[1] > productExtent_[3]) {
      return [-1, -1]
    }

    const propX = (productXY[0] - productExtent_[0]) / (productExtent_[2] - productExtent_[0])
    const propY = 1 - (productXY[1] - productExtent_[1]) / (productExtent_[3] - productExtent_[1])
    // With pixel centers: extent bounds are the geographic positions of the outermost pixel centers.
    // For width pixels (indices 0 to width-1), centers span from 0.5 to width-0.5.
    // So propX=0 maps to pixel 0, propX=1 maps to pixel (width-1).
    const pxX = Math.round(propX * (productWidth - 1))
    const pxY = Math.round(propY * (productHeight - 1))
    return [pxX, pxY]
  }
}
