// -*- indent-tabs-mode: nil; -*-
import React from 'react'
import LRU from 'lru-cache'

import stringify from 'json-stable-stringify'

import {ImageCanvas} from 'ol/source'
import {Image} from 'ol/layer'
import {Map as OlMap, View} from 'ol'
import {OSM} from 'ol/source'
import {Tile} from 'ol/layer'
import {fromLonLat, toLonLat} from 'ol/proj'
import {computeExtent, toMapCoordsExtent, canvasPxToProductPx} from '../coordinate'

import {ObserverActions} from '../constants'

import {DataValueType, integerToDataValue} from './datavalue'
import {NOT_SCANNED_COLOR, NO_ECHO_COLOR, reflectivityValueToNOAAColor} from './coloring'


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
    this.__renderedProducts = new LRU(cacheOpts)
  }

  __onResize() {
    let elem = document.getElementById(this.props.headerElementId)
    let desiredHeight = window.innerHeight - elem.offsetHeight
    let style = '' + desiredHeight + 'px'
    document.getElementById('map-element').style.height = style
    this.map.updateSize()
  }

  __updateMap() {
    if (this.map == undefined) {
      return
    }
    if (this.__previousIntendedCenter[0] != this.props.intendedCenter[0] ||
        this.__previousIntendedCenter[1] != this.props.intendedCenter[1]) {
      let mapProjection = this.map.getView().getProjection()
      this.map.getView().setCenter(fromLonLat(this.props.intendedCenter, mapProjection))
    }
    this.__previousIntendedCenter = this.props.intendedCenter
  }

  componentDidMount() {
    this.map = new OlMap({
      view: new View({
        center: [0, 0],
        zoom: 7
      }),
      layers: [
        new Tile({
          // https://cartodb.com/basemaps
          source: new OSM({
            attributions: [
              // '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
              ' &copy; <a href="http://cartodb.com/attributions">CartoDB</a>, ' +
              ' &copy; <a href="https://en.ilmatieteenlaitos.fi/open-data-manual-radar-data">FMI Open Radar Data</a>' +
              ' <a href="https://en.ilmatieteenlaitos.fi/open-data-licence">CC BY 4.0</a>, '
            ],
            url: 'http://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'
          })
        }),

        new Tile({
          // https://cartodb.com/basemaps
          source: new OSM({
            url: 'http://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
            opaque: false
          })
        })
      ],
      target: 'map-element',
    })

    // Set ratio to 1 for canvas exactly the size of the viewport, i.e. every
    // scroll is a re-render.
    this.imageCanvas = new ImageCanvas({
      canvasFunction: this.__canvasFunction
      // ratio: 1
    })
    this.imageLayer = new Image({ source: this.imageCanvas })
    this.map.getLayers().insertAt(1, this.imageLayer);

    let dispatch = this.props.dispatch;
    this.map.on('moveend', function(event) {
      let view = event.map.getView()
      let center = view.getCenter()
      let projection = view.getProjection()
      let lonLatCenter = toLonLat(center, projection)

      dispatch({type: ObserverActions.MAP_MOVED,
        payload: {lon: lonLatCenter[0], lat: lonLatCenter[1]}})
    })

    setTimeout(this.__onResize, 200)
    window.addEventListener('resize', this.__onResize)
    this.__updateMap()
  }

  __canvasFunction(extent, resolution, pixelRatio, size, projection) { // eslint-disable-line no-unused-vars
    let startRender = new Date().getTime();

    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.floor(size[0])
    this.canvas.height = Math.floor(size[1])

    if (this.props.product == null || this.props.product == undefined) {
      console.warn('__canvasFunction not rendering because of null currentProduct')
      return this.canvas
    }


    let data = this.props.product.data
    let dataView = new Uint8Array(data)
    let dataRows = this.props.product._rows
    let metadata = this.props.product.metadata

    let ctx = this.canvas.getContext('2d')

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

    let productCoordsExtent = computeExtent(metadata.affineTransform, metadata.width, metadata.height)
    let mapCoordsExtent = toMapCoordsExtent(fromLonLat, productCoordsExtent)
    let mapCoordsWidth = mapCoordsExtent[2] - mapCoordsExtent[0]
    let mapCoordsHeight = mapCoordsExtent[3] - mapCoordsExtent[1]

    // Normal rendering
    let imageData = ctx.createImageData(this.canvas.width, this.canvas.height)
    let iData = imageData.data
    for (let x=0; x<this.canvas.width; x++) {
      for (let y=0; y<this.canvas.height; y++) {
        let dataPxXY = canvasPxToProductPx(
          metadata.affineTransform,
          metadata.width, metadata.height,
          mapCoordsExtent,
          mapCoordsWidth, mapCoordsHeight,
          extent,
          this.canvas.width, this.canvas.height,
          x, y
        )

        let value = metadata.productInfo.dataScale.notScanned
        if (dataPxXY[0] != -1) {
          value = dataView[dataPxXY[0] * dataRows + dataPxXY[1]]
        }

        let color = null
        if (metadata.productInfo.dataType == 'REFLECTIVITY') {
          const [valueType, dataValue] = integerToDataValue(metadata.productInfo.dataScale, value)
          if (valueType == DataValueType.NOT_SCANNED) {
            color = NOT_SCANNED_COLOR
          } else if (valueType == DataValueType.NO_ECHO) {
            color = NO_ECHO_COLOR
          } else if (valueType == DataValueType.VALUE) {
            const [r, g, b] = reflectivityValueToNOAAColor(dataValue)
            color = [r, g, b, 255]
          } else {
            throw new Error('Unknown DataValueType: ' + valueType)
          }
        } else {
          if (value == metadata.productInfo.dataScale.notScanned) {
            color = NOT_SCANNED_COLOR
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
    console.info('Rendering took', elapsedMs, 'ms @', Math.floor(pixelCount / (elapsedMs / 1000) / 1000), 'kpx/s') // eslint-disable-line no-console
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
