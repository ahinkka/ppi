import React from "react"
import pako from "pako";
import ol from "openlayers"

import {httpGetPromise} from "../utils"
import {ObserverActions} from "../constants/ObserverConstants"


const inflate = (stream) => {
  try {
    return pako.inflate(stream, { to: 'string' })
  } catch (err) {
    console.log("Error while decompressing product file:", err);
  }
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

  componentWillUnmount() {
    window.removeEventListener('resize', this.__onResize)
  }

  __drawProduct(obj) {
    let data = obj.data
    let metadata = obj.metadata

    // TODO: actually resolve the projections and don't assume a shared one
    //  - fix the metadata creation in download/extraction to get the correct one
    //  - resolve map projection

    let productProj = "EPSG:4326"
    let mapProj = "EPSG:3857"

        // "affineTransform": [
        //     19.8869934197,
        //     0.009449604183593748,
        //     0.0,
        //     62.5293188598,
        //     0.0,
        //     -0.0045287129015625024

    // Starts from left upper corner
    let xOrigin = affineTransform[0]
    let yOrigin = affineTransform[3]
    let xStep = affineTransform[1]
    let yStep = affineTransform[5]

    for (let rowIndex in data) {
      let row = data[rowIndex]
      for (let colIndex in data) {
	let value = row[colIndex]

	// next steps:
	// - for each data value here render it on the raster that's drawn on
	//   top of the openlayers map
      }
    }
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
