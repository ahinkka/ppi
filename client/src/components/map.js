import React from "react"
import pako from "pako";
import ol from "openlayers"
import ndarray from "ndarray"
import {d1 as l_interp, d2 as bl_interp} from "ndarray-linear-interpolate"

import {httpGetPromise} from "../utils"
import {ObserverActions} from "../constants/ObserverConstants"


const inflate = (stream) => {
  try {
    return pako.inflate(stream, { to: 'string' })
  } catch (err) {
    console.log("Error while decompressing product file:", err);
  }
}


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


export const CenterState = {
  NO_CHANGE: "no change",
  CHANGE: "change"
}


export class Map extends React.Component {
  constructor(props) {
    super(props);
    this.__onResize = this.__onResize.bind(this);
    this.__updateMap = this.__updateMap.bind(this);
    this.__renderProduct = this.__renderProduct.bind(this);
    this.__drawProduct = this.__drawProduct.bind(this);
    this.__canvasFunction = this.__canvasFunction.bind(this);
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
    let center = this.props.center
    if (center.change == CenterState.CHANGE) {
      let mapProjection = this.map.getView().getProjection()
      this.map.getView().setCenter(ol.proj.fromLonLat(center.coordinates, mapProjection))
    }
    // console.log("Map update", center.coordinates)
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

    let layers = this.map.getLayers();
    this.imageCanvas = new ol.source.ImageCanvas({
      canvasFunction: this.__canvasFunction,
      ratio: 1
    })
    this.imageLayer = new ol.layer.Image({ source: this.imageCanvas })
    layers.insertAt(1, this.imageLayer);

    let dispatch = this.props.dispatch;
    this.map.on('moveend', function(event) {
      let view = event.map.getView()
      let extent = view.calculateExtent(event.map.getSize())
      let projection = view.getProjection()
      let lonLatCenter = ol.proj.toLonLat(extent, projection)

      if (this.props !== undefined &&
	  lonLatCenter[0] == this.props.center.coordinates[0] &&
	  lonLatCenter[1] == this.props.center.coordinates[1]) {
	return;
      }

      // let projCode = projection.getCode()
      dispatch({type: ObserverActions.EXTENT_CHANGED,
		payload: {lon: lonLatCenter[0], lat: lonLatCenter[1]}})
    })

    setTimeout(this.__onResize, 200)
    window.addEventListener('resize', this.__onResize)
    this.__updateMap()
  }

  __canvasFunction(extent, resolution, pixelRatio, size, projection) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.floor(size[0])
    this.canvas.height = Math.floor(size[1])
    this.canvasOpts = {
      extent: extent,
      resolution: resolution,
      pixelRatio: pixelRatio,
      size: size,
      projection: projection
    }
    console.log("__canvasFunction", this.canvasOpts)
    return this.canvas
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.__onResize)
  }

  __drawProduct(obj) {
    let data = obj.data
    let metadata = obj.metadata

    // Currently we expect the products to be in EPSG:3426 and the map in
    // EPSG:3857.  We should support arbitrary input projections. And we also
    // expect to work with positive Web Mercator coordinates...

    let productLonLatExtent = computeExtent(metadata.affineTransform,
					    metadata.width, metadata.height)
    // console.log("productLonLatExtent", productLonLatExtent)
    let minLonLat = [productLonLatExtent[0], productLonLatExtent[1]]
    let maxLonLat = [productLonLatExtent[2], productLonLatExtent[3]]
    let min = ol.proj.fromLonLat(minLonLat)
    let max = ol.proj.fromLonLat(maxLonLat)
    let productExtent = [min[0], min[1], max[0], max[1]]


    // Lookup function from Web Mercator to product grid
    let lonWidth = productExtent[2] - productExtent[0]
    let latHeight = productExtent[3] - productExtent[1]
    let lonLatToProductPx = (lon, lat) => {
      if (lon < productExtent[0] || lon > productExtent[2] ||
	  lat < productExtent[1] || lat > productExtent[3]) {
	return [undefined, undefined]
      }
      let propX = (lon - productExtent[0]) / lonWidth
      let propY = (lat - productExtent[1]) / latHeight
      // console.log(propX, propY)
      let pxX = Math.floor(propX * metadata.width)
      let pxY = Math.floor(propY * metadata.height)
      return [pxX, pxY]
    }
    // let a = productPxToLonLat(512, 512)
    // console.log(lonLatToProductPx(a[0], a[1]))

    
    // Lookup function from canvas grid to Web Mercator
    let canvasExtent = this.canvasOpts.extent;
    let xCanvasExtents = ndarray(new Float32Array([canvasExtent[0], canvasExtent[2]], 1, 2))
    let yCanvasExtents = ndarray(new Float32Array([canvasExtent[1], canvasExtent[3]], 1, 2))
    let canvasPxToLonLat = (xPx, yPx) => {
      let propX = xPx / metadata.width
      let propY = yPx / metadata.height
      let x = l_interp(xCanvasExtents, propX)
      let y = l_interp(yCanvasExtents, propY)
      return [x, y]
    }
    // console.log(canvasPxToLonLat(0, 0))
    // console.log(canvasPxToLonLat(512, 512))
    // console.log(canvasPxToLonLat(1024, 1024))

    let ctx = this.canvas.getContext("2d")
    for (let x=0; x<this.canvas.width; x++) {
      for (let y=0; y<this.canvas.height; y++) {
	if (y % 50 != 0 || x % 50 != 0) {
	  continue
	}

	let lonLatXY = canvasPxToLonLat(x, y)
	let dataPxXY = lonLatToProductPx(lonLatXY[0], lonLatXY[1])
	let value = undefined
	if (dataPxXY[0] === undefined) {
	  value = 252 // metadata.productInfo.dataScale.notScanned
	} else {
    	  value = data[dataPxXY[0]][dataPxXY[1]]
	}

	if (y % 200 == 0 && x % 200 == 0) {
	  console.log("canvasPX", x, y)
	  console.log("lonlat", lonLatXY)
	  console.log("dataPx", dataPxXY)
	}

	if (value == 252) { // metadata.productInfo.dataScale.notScanned) {
	  ctx.fillStyle = "rgba(211, 211, 211, 0.2)"
	} else {
	  ctx.fillStyle = "blue"
	}

	ctx.fillRect(x, y, 50, 50)
      }
    }

    // context.save()
    // context.fillStyle = "rgba(211, 211, 211, 0.2)";
    // context.fillRect(0, 0, width, height)
    // context.restore()

    // 	let mapCoord = this.map.getCoordinateFromPixel([pixX, pixY])
    // 	let lonLat = ol.proj.toLonLat(mapCoord, projection)
  }

  __renderProduct(productUrl) {
    if (productUrl == null) {
      return
    }

    let m = this;

    httpGetPromise(productUrl + ".gz", true)
      .then(inflate)
      .then(JSON.parse)
      .then((obj) => {
	console.log("Rendering product from", productUrl)
	m.__drawProduct(obj)
      })
  }

  render() {
    console.log("Map.render()", this.props.productUrl)

    this.__updateMap()

    if (this.map != undefined) {
      let view = this.map.getView()
      this.__renderProduct(this.props.productUrl);
    }

    return (
      <div id="map-element"></div>
    )
  }
}


const makeMapCenter = (oldLon, oldLat, newLon, newLat) => {
  let shouldCenterOnRadar = CenterState.CHANGE
  if (oldLon == newLon && oldLat == newLat) {
    shouldCenterOnRadar = CenterState.NO_CHANGE
  } else {
    shouldCenterOnRadar = CenterState.CHANGE
  }
  return {change: shouldCenterOnRadar, coordinates: [newLon, newLat]}
}
