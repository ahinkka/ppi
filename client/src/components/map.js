// -*- indent-tabs-mode: nil; -*-
import React from "react"
import pako from "pako";
import LRU from "lru-cache"
import ol from "openlayers"
import ndarray from "ndarray"
import {d1 as l_interp} from "ndarray-linear-interpolate"
import stringify from "json-stable-stringify"

import {httpGetPromise} from "../utils"
import {ObserverActions} from "../constants"

import {DataValueType, integerToDataValue} from "./datavalue"
import {NOT_SCANNED_COLOR, NO_ECHO_COLOR, reflectivityValueToNOAAColor} from "./coloring"


const computeExtent = (affineTransform, width, height) => {
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
  let extreme = [origin[0] + affineTransform[1] * width,
                 origin[1] + affineTransform[5] * height]
  // extent = [minX, minY, maxX, maxY]
  return [Math.min(origin[0], extreme[0]), Math.min(origin[1], extreme[1]),
          Math.max(origin[0], extreme[0]), Math.max(origin[1], extreme[1])]
}


// Currently we expect the products to be in EPSG:3426 and the map in
// EPSG:3857.  We should support arbitrary input projections. And we also
// expect to work with positive Web Mercator coordinates...
let _lonLatToProductPx = (productExtent, productLonWidth, productLatHeight, productPixWidth, productPixHeight, lon, lat) => {
  if (lon < productExtent[0] || lon > productExtent[2] ||
      lat < productExtent[1] || lat > productExtent[3]) {
    return [undefined, undefined]
  }
  let propX = (lon - productExtent[0]) / productLonWidth
  let propY = 1 - (lat - productExtent[1]) / productLatHeight
  let x = Math.floor(propX * productPixWidth)
  let y = Math.floor(propY * productPixHeight)
  return [x, y]
}


let makeLonLatToProductPxFunction = (productAffineTransform, productWidth, productHeight) => {
  let productLonLatExtent = computeExtent(productAffineTransform, productWidth, productHeight)
  let minLonLat = [productLonLatExtent[0], productLonLatExtent[1]]
  let maxLonLat = [productLonLatExtent[2], productLonLatExtent[3]]
  let min = ol.proj.fromLonLat(minLonLat)
  let max = ol.proj.fromLonLat(maxLonLat)
  let productExtent = [min[0], min[1], max[0], max[1]]
  let lonWidth = productExtent[2] - productExtent[0]
  let latHeight = productExtent[3] - productExtent[1]

  return (lon, lat) => _lonLatToProductPx(productExtent, lonWidth, latHeight, productWidth, productHeight, lon, lat)
}


let _canvasPxToLonLat = (canvasWidth, canvasHeight, xCanvasExtents, yCanvasExtents, x, y) => {
  let propX = x / canvasWidth
  let propY = 1 - y / canvasHeight
  let lon = l_interp(xCanvasExtents, propX)
  let lat = l_interp(yCanvasExtents, propY)
  return [lon, lat]
}


let makeCanvasPxToLonLatFunction = (canvasExtent, canvasWidth, canvasHeight) => {
  let xCanvasExtents = ndarray(new Float32Array([canvasExtent[0], canvasExtent[2]], 1, 2))
  let yCanvasExtents = ndarray(new Float32Array([canvasExtent[1], canvasExtent[3]], 1, 2))
  return (x, y) => _canvasPxToLonLat(canvasWidth, canvasHeight, xCanvasExtents, yCanvasExtents, x, y)
}


export class Map extends React.Component {
  constructor(props) {
    super(props);

    this.__previousProduct = null;

    this.__onResize = this.__onResize.bind(this);
    this.__updateMap = this.__updateMap.bind(this);
    this.__canvasFunction = this.__canvasFunction.bind(this);

    this.__previousIntendedCenter = [0, 0]

    let cacheOpts = {
      max: 50, // maximum number of items
      maxAge: 1000 * 60 * 15, // items considered over 15 minutes are stale
      stale: false,
    }
    this.__renderedProducts = LRU(cacheOpts)
  }

  __onResize() {
    let elem = document.getElementById(this.props.headerElementId)
    let desiredHeight = window.innerHeight - elem.offsetHeight
    let style = "" + desiredHeight + "px"
    document.getElementById("map-element").style.height = style
    this.map.updateSize()
  }

  __updateMap() {
    if (this.map == undefined) {
      return
    }
    if (this.__previousIntendedCenter[0] != this.props.intendedCenter[0] ||
        this.__previousIntendedCenter[1] != this.props.intendedCenter[1]) {
      let mapProjection = this.map.getView().getProjection()
      this.map.getView().setCenter(ol.proj.fromLonLat(this.props.intendedCenter, mapProjection))
    }
    this.__previousIntendedCenter = this.props.intendedCenter
  }

  componentDidMount() {
    console.log("Map.componentDidMount()")
    this.map = new ol.Map({
      view: new ol.View({
        center: [0, 0],
        zoom: 7
      }),
      layers: [
        new ol.layer.Tile({
          // https://cartodb.com/basemaps
          source: new ol.source.OSM({
            attributions: [
              new ol.Attribution({
              html:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
                ' &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
              })
            ],
            url: "http://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
          })
        }),

        new ol.layer.Tile({
          // https://cartodb.com/basemaps
          source: new ol.source.OSM({
            attributions: [
              new ol.Attribution({
              html:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
                ' &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
              })
            ],
            url: "http://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
          })
        })
      ],
      target: 'map-element',
    })

    // Set ratio to 1 for canvas exactly the size of the viewport, i.e. every
    // scroll is a re-render.
    this.imageCanvas = new ol.source.ImageCanvas({
      canvasFunction: this.__canvasFunction
      // ratio: 1
    })
    this.imageLayer = new ol.layer.Image({ source: this.imageCanvas })
    this.map.getLayers().insertAt(1, this.imageLayer);

    let dispatch = this.props.dispatch;
    this.map.on('moveend', function(event) {
      let view = event.map.getView()
      // let extent = view.calculateExtent(event.map.getSize())
      let center = view.getCenter()
      let projection = view.getProjection()
      let lonLatCenter = ol.proj.toLonLat(center, projection)

      // let projCode = projection.getCode()
      dispatch({type: ObserverActions.MAP_MOVED,
                payload: {lon: lonLatCenter[0], lat: lonLatCenter[1]}})
    })

    setTimeout(this.__onResize, 200)
    window.addEventListener('resize', this.__onResize)
    this.__updateMap()
  }

  __canvasFunction(extent, resolution, pixelRatio, size, projection) {
    let startRender = new Date().getTime();

    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.floor(size[0])
    this.canvas.height = Math.floor(size[1])

    if (this.props.product == null || this.props.product == undefined) {
      console.warn("__canvasFunction not rendering because of null currentProduct")
      return this.canvas
    }


    let data = this.props.product.data
    let metadata = this.props.product.metadata

    // Grid to grid lookup functions
    let lonLatToProductPx = makeLonLatToProductPxFunction(metadata.affineTransform, metadata.width, metadata.height)
    let canvasPxToLonLat = makeCanvasPxToLonLatFunction(extent, this.canvas.width, this.canvas.height)

    let canvasPxToProductPx = (x, y) => {
      let lonLatXY = canvasPxToLonLat(x, y)
      let dataPxXY = lonLatToProductPx(lonLatXY[0], lonLatXY[1])
      return dataPxXY
    }

    let ctx = this.canvas.getContext("2d")

    // Cached rendering
    const cacheKey = stringify([this.props.productSelection, this.props.productTime,
                                extent, this.canvas.width, this.canvas.height])
    const cached = this.__renderedProducts.get(cacheKey)
    if (cached !== undefined) {
      this.canvas = cached
      // let elapsedMs = new Date().getTime() - startRender;
      // let pixelCount = this.canvas.width * this.canvas.height
      // console.log("Cached rendering took", elapsedMs, "ms @", Math.floor(pixelCount / (elapsedMs / 1000) / 1000), "kpx/s")
      this.props.dispatch({type: ObserverActions.PRODUCT_TIME_CHANGED,
                           payload: this.props.productTime})
      return this.canvas
    }

    // Normal rendering
    let imageData = ctx.createImageData(this.canvas.width, this.canvas.height)
    let iData = imageData.data
    for (let x=0; x<this.canvas.width; x++) {
      for (let y=0; y<this.canvas.height; y++) {
        let dataPxXY = canvasPxToProductPx(x, y)

        let value = undefined
        if (dataPxXY[0] === undefined) {
          value = metadata.productInfo.dataScale.notScanned
        } else {
          value = data[dataPxXY[0]][dataPxXY[1]]
        }

        let color = null
        if (metadata.productInfo.dataType == "REFLECTIVITY") {
          const [valueType, dataValue] = integerToDataValue(metadata.productInfo.dataScale, value)
          if (valueType == DataValueType.NOT_SCANNED) {
            color = NOT_SCANNED_COLOR;
          } else if (valueType == DataValueType.NO_ECHO) {
            color = NO_ECHO_COLOR;
          } else if (valueType == DataValueType.VALUE) {
            const [r, g, b] = reflectivityValueToNOAAColor(dataValue)
            color = [r, g, b, 255]
          } else {
            throw Exception("Unknown DataValueType: " + valueType)
          }
        } else {
          if (value == metadata.productInfo.dataScale.notScanned) {
            // color.set([211, 211, 211, 76])
            color = notScannedColor;
          } else {
            color = [0, 0, 255, Math.floor((value / 150) * 255)]
          }
        }

        let redIndex = (y * imageData.width * 4) + (x * 4);
        iData[redIndex] = color[0]
        iData[redIndex + 1] = color[1]
        iData[redIndex + 2] = color[2]
        iData[redIndex + 3] = color[3]

        // This will likely get faster in the future but for now it's slow:
        //  https://bugs.chromium.org/p/v8/issues/detail?id=3590&desc=2
        // iData.set(color, redIndex)
      }
    }
    ctx.putImageData(imageData, 0, 0);

    this.__renderedProducts.set(cacheKey, this.canvas)

    let elapsedMs = new Date().getTime() - startRender;
    let pixelCount = this.canvas.width * this.canvas.height
    console.log("Rendering took", elapsedMs, "ms @", Math.floor(pixelCount / (elapsedMs / 1000) / 1000), "kpx/s")
    this.props.dispatch({type: ObserverActions.PRODUCT_TIME_CHANGED,
                         payload: this.props.productTime})

    return this.canvas
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.__onResize)
  }

  render() {
    if (this.__previousProduct == null || this.previousProduct != this.props.product) {
      this.__previousProduct == this.props.product
      if (this.imageCanvas !== undefined) {
        this.imageCanvas.changed()
      }
    }

    this.__updateMap()

    return (
      <div id="map-element"></div>
    )
  }
}
