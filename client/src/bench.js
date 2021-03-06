/* eslint no-console: "off" */
import * as fs from 'fs'
import {
  canvasPxToProductPx,
  convertCoordinate,
  productExtent
} from './reprojection'

const product = JSON.parse(
  fs.readFileSync('test/202104091015_FIN-DBZ-3067-250M-150px.json', 'utf8')
)
const metadata = product.metadata

const [pToM,] = convertCoordinate(metadata.projectionRef, 'EPSG:3857')
const productExtent_ = productExtent(metadata.affineTransform, metadata.width, metadata.height)
const peMin = pToM([productExtent_[0], productExtent_[1]])
const peMax = pToM([productExtent_[2], productExtent_[3]])

const canvasExtent = [peMin[0] - 0.5, peMin[1] - 0.5, peMax[0] + 0.5, peMax[1] + 0.5]
const [canvasWidth, canvasHeight] = [1000, 1000]

const iterations = 10
const pixelCount = canvasWidth * canvasHeight

const startedAt = new Date().getTime()
const fn = canvasPxToProductPx(
  metadata.projectionRef,
  metadata.affineTransform,
  metadata.width,
  metadata.height,
  'EPSG:3857',
  canvasExtent,
  canvasWidth,
  canvasHeight,
)
for (let i=0; i<iterations; i++) {
  for (let x=0; x<canvasWidth; x++) {
    for (let y=0; y<canvasHeight; y++) {
      fn(x, y)
    }
  }
}

const endedAt = new Date().getTime()
console.log(pixelCount / (((endedAt - startedAt) / iterations)), 'px/s')
