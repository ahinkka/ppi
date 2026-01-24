// -*- indent-tabs-mode: nil; -*-
import React, { Dispatch } from 'react'
import { Popover } from 'bootstrap'
import { LRUCache } from 'lru-cache'

import stringify from 'json-stable-stringify'

import { Extent as OlExtent } from 'ol/extent'
import ImageCanvas from 'ol/source/ImageCanvas'
import Image from 'ol/layer/Image'
import View from 'ol/View'
import OlMap from 'ol/Map'
import OSMSource from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import Overlay from 'ol/Overlay'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import Feature from 'ol/Feature'
import MapEvent from 'ol/MapEvent'
import CircleStyle from 'ol/style/Circle'
import FillStyle from 'ol/style/Fill'
import StrokeStyle from 'ol/style/Stroke'
import Style from 'ol/style/Style'
import { Coordinate } from 'ol/coordinate'
import Point from 'ol/geom/Point'
import { Size } from 'ol/size'
import Projection from 'ol/proj/Projection'
import { FeatureLike } from 'ol/Feature'

import { fromLonLat, toLonLat } from 'ol/proj'
import { getDistance } from 'ol/sphere'
import GeoJSON from 'ol/format/GeoJSON'

import { Action } from './action'
import { canvasPxToProductPx, wgs84ToProductPx, Extent } from './reprojection'
import { LoadedProduct } from './product_loader'
import { State } from './state'

import { DataScale, DataValueType, integerToDataValue } from './datavalue'
import {
  fillWithNotScanned,
  NOT_SCANNED_COLOR,
  resolveColorForReflectivity,
  resolveColorGeneric
} from './coloring'

// Augment HTMLElement to include _popover property
declare global {
  interface HTMLElement {
    _popover?: Popover
  }
}

// https://24ways.org/2010/calculating-color-contrast
const yiqColorContrast = (r: number, g: number, b: number) =>
  (r * 299 + g * 587 + b * 114) / 1000.0 >= 128


const bearingToCompassRoseReading = (bearing: number) => {
  const cardinals: [string, number][] = [
    ['S', 0], ['SSE', 22.5], ['SE', 45], ['ESE', 67.5],
    ['E', 90], ['ENE', 112.5], ['NE', 135], ['NNE', 157.5],
    ['N', 180], ['NNW', 202.5], ['NW', 225], ['WNW', 247.5],
    ['W', 270], ['WSW', 292.5], ['SW', 315], ['SSW', 337.5],
  ]

  let currentClosest = ['X', 360] as [string, number]
  for (let i = 0; i < cardinals.length; i++) {
    const [name, angle] = cardinals[i]
    const difference = Math.abs(bearing - angle)

    if (difference < currentClosest[1]) {
      currentClosest = [name, difference]
    } else if (difference > currentClosest[1])
      break
  }

  return currentClosest[0]
}


const renderCursorToolContentAndColors = (
  value: number,
  dataScale: DataScale,
  dataUnit: DataValueType,
  color: [number, number, number, number],
  nearestCityName: string, distanceToNearestCity: number, bearingToNearestCity: number,
  nearestTownName: string, distanceToNearestTown: number, bearingToNearestTown: number
) => {
  const [valueType, dataValue] = integerToDataValue(dataScale, value)

  let textContent = null
  let bgColor = 'white'
  let textColor = 'black'
  if (valueType == DataValueType.NOT_SCANNED) {
    textContent = 'NOT SCANNED'
    bgColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.75)`
  } else if (valueType == DataValueType.NO_ECHO) {
    textContent = 'NO ECHO'
    bgColor = 'rgba(255, 255, 255, 0.75)'
  } else if (valueType == DataValueType.VALUE) {
    textContent = `${dataValue} <small>${dataUnit}</small>`
    bgColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255.0})`
    textColor = !yiqColorContrast(color[0], color[1], color[2]) ? 'white' : 'black'
  }

  if (
    nearestCityName && distanceToNearestCity !== undefined && bearingToNearestCity !== undefined && // eslint-disable-line max-len
    nearestTownName && distanceToNearestTown !== undefined && bearingToNearestTown !== undefined
  ) {
    return [`<div id="cursor-tool-content"><b>${textContent}</b><br><small>${nearestCityName} ${distanceToNearestCity} km ${bearingToCompassRoseReading(bearingToNearestCity)}<br>${nearestTownName} ${distanceToNearestTown} km ${bearingToCompassRoseReading(bearingToNearestTown)}</small></div>`, bgColor, textColor]
  } else {
    return [`<div id="cursor-tool-content"><b>${textContent}</b></div>`, bgColor, textColor]
  }
}


// Source: https://www.movable-type.co.uk/scripts/latlong.html
const bearingBetweenCoordinates = (source: [number, number], destination: [number, number]) => {
  const [fromLon, fromLat] = source
  const [toLon, toLat] = destination

  const y = Math.sin(toLon - fromLon) * Math.cos(toLat)
  const x = Math.cos(fromLat) * Math.sin(toLat)
    - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(toLon - fromLon)
  const o = Math.atan2(y, x)
  return (o * 180 / Math.PI + 360) % 360
}

function resolveNearestCityAndTown(
  vectorSource: VectorSource,
  coords: [number, number],
  coordsLonLat: [number, number]
): {
  nearestCityName?: string,
  distanceToNearestCity?: number,
  bearingToNearestCity?: number,
  nearestTownName?: string,
  distanceToNearestTown?: number,
  bearingToNearestTown?: number
} {
  if (vectorSource.getFeatures().length == 0) {
    return {}
  }

  const nearestCity: Feature = vectorSource.getClosestFeatureToCoordinate(
    coords,
    (feature: Feature) => feature.get('osmPlace') === 'city'
  )
  const nearestCityLonLat =
    toLonLat((nearestCity.getGeometry() as Point).getCoordinates()) as [number, number]
  const distanceToNearestCity = Math.round(getDistance(nearestCityLonLat, coordsLonLat) / 1000)
  const bearingToNearestCity = bearingBetweenCoordinates(coordsLonLat, nearestCityLonLat)

  const nearestTown: Feature = vectorSource.getClosestFeatureToCoordinate(
    coords,
    (feature: Feature) => feature.get('osmPlace') === 'town'
  )
  const nearestTownLonLat =
    toLonLat((nearestTown.getGeometry() as Point).getCoordinates()) as [number, number]
  const distanceToNearestTown = Math.round(getDistance(nearestTownLonLat, coordsLonLat) / 1000)
  const bearingToNearestTown = bearingBetweenCoordinates(coordsLonLat, nearestTownLonLat)

  return {
    nearestCityName: nearestCity?.get('name') as string | undefined,
    distanceToNearestCity,
    bearingToNearestCity,
    nearestTownName: nearestTown?.get('name') as string | undefined,
    distanceToNearestTown,
    bearingToNearestTown
  }
}

const resolveCursorToolContentAndColors = (
  product: LoadedProduct,
  vectorSource: VectorSource,
  coords: [number, number],
  wgs84ToProductPxFn: (lon: number, lat: number) => [number, number]
) => {
  if (!product || !product.metadata) return ['', 'white', 'black']

  const data = product.data
  const dataView = new Uint8Array(data)
  const dataRows = product._rows
  const metadata = product.metadata
  const coordsLonLat = toLonLat(coords) as [number, number]

  const dataPxXY = wgs84ToProductPxFn(coordsLonLat[0], coordsLonLat[1])

  let effectiveValue = dataView[dataPxXY[0] * dataRows + dataPxXY[1]]
  if (effectiveValue === undefined) effectiveValue = metadata.productInfo.dataScale.notScanned

  const color: [number, number, number, number] = metadata.productInfo.dataType == 'REFLECTIVITY' ?
    resolveColorForReflectivity(metadata.productInfo.dataScale, effectiveValue) :
    resolveColorGeneric(metadata.productInfo.dataScale, effectiveValue)

  const {
    nearestCityName, distanceToNearestCity, bearingToNearestCity,
    nearestTownName, distanceToNearestTown, bearingToNearestTown
  } = resolveNearestCityAndTown(vectorSource, coords, coordsLonLat)

  return renderCursorToolContentAndColors(
    effectiveValue,
    metadata.productInfo.dataScale,
    metadata.productInfo.dataUnit,
    color,
    nearestCityName,
    distanceToNearestCity,
    bearingToNearestCity,
    nearestTownName,
    distanceToNearestTown,
    bearingToNearestTown,
  )
}


// https://openlayers.org/en/latest/examples/overlay.html
const updateCursorTool = (
  overlay: Overlay,
  product: LoadedProduct,
  vectorSource: VectorSource,
  newPosition: Coordinate,
  resolveTemplateAndColors: typeof resolveCursorToolContentAndColors,
  conversionFn: (lon: number, lat: number) => [number, number]
) => {
  const element = overlay.getElement()

  if (element._popover) {
    try {
      element._popover.dispose()
    } catch (e) {
      // Popover might already be disposed
      console.warn('Popover disposal error (safe to ignore):', e)
    }
    element._popover = undefined
  }

  const effectivePosition =
    (newPosition ? newPosition : overlay.getPosition()) as [number, number]
  if (newPosition) overlay.setPosition(effectivePosition)

  const [content, backgroundColor, textColor] = resolveTemplateAndColors(
    product,
    vectorSource,
    effectivePosition,
    conversionFn
  )

  const popover = new Popover(element, {
    container: element,
    placement: 'auto',
    offset: [8, 32], // Convert from '0.5vh, 2vw' to pixels (approximate)
    animation: false,
    html: true,
    content: content,
  })

  // Apply custom styling after popover is shown
  element.addEventListener('inserted.bs.popover', function styleHandler() {
    const popoverEl = element.querySelector('.popover')
    if (popoverEl) {
      (popoverEl as HTMLElement).style.backgroundColor = backgroundColor
      const allElements = popoverEl.querySelectorAll('*')
      allElements.forEach(el => {
        (el as HTMLElement).style.color = textColor
      })
    }
    element.removeEventListener('inserted.bs.popover', styleHandler)
  }, { once: true })

  popover.show()
  element._popover = popover // Store for disposal
}

type Props = {
  headerElementId: string,
  intendedCenter: [number, number],
  product: LoadedProduct,
  geoInterests: State['geoInterests'],
  productTime: number | null,
  productSelection: [string, string, string],
  dispatch: Dispatch<Action>
}

const cacheOpts = {
  max: 50, // maximum number of items
  ttl: 1000 * 60 * 15, // items considered over 15 minutes are stale
  allowStale: false,
}

export class Map extends React.Component<Props> {
  private __previousProduct: LoadedProduct | null = null
  private __previousIntendedCenter: [number, number] = [0, 0]
  private __renderedProducts: LRUCache<string, HTMLCanvasElement> = new LRUCache(cacheOpts)
  private __colorCaches: Record<string, Record<number, [number, number, number, number]>> = {}
  private mapToProductConversionFn: (x: number, y: number) => [number, number] | null = null
  private wgs84ToProductConversionFn: (x: number, y: number) => [number, number] | null = null
  private conversionCacheKey: string = ''
  private cursorToolVisible: boolean = false
  private __vectorSource: VectorSource | null = null
  private __vectorLayer: VectorLayer<VectorSource> | null = null
  private map: OlMap | null = null
  private imageCanvas: ImageCanvas | null = null
  private imageLayer: Image<ImageCanvas> | null = null
  private cursorToolOverlay: Overlay | null = null
  private canvas: HTMLCanvasElement | null = null
  private mapElementRef = React.createRef<HTMLDivElement>()
  private cursorToolOverlayRef = React.createRef<HTMLDivElement>()
  private __resizeTimeout: number | null = null

  constructor(props: Readonly<Props> | Props) {
    super(props);

    this.__onResize = this.__onResize.bind(this);
    this.__onMouseLeave = this.__onMouseLeave.bind(this);
    this.__updateMap = this.__updateMap.bind(this);
    this.__canvasFunction = this.__canvasFunction.bind(this);

    this.__vectorSource = new VectorSource({})

    const cityStyle = new Style({
      image: new CircleStyle({
        radius: 3,
        fill: new FillStyle({
          color: 'rgba(0,0,0,0.2)',
        }),
        stroke: new StrokeStyle({ color: 'black', width: 1 }),
      })
    })

    const townStyle = new Style({
      image: new CircleStyle({
        radius: 1,
        stroke: new StrokeStyle({ color: 'black', width: 1 }),
      })
    })

    this.__vectorLayer = new VectorLayer({
      source: this.__vectorSource,
      style: (feature: FeatureLike) => {
        const osmPlace = feature.get('osmPlace') as string
        if (osmPlace === 'city') {
          return cityStyle
        } else if (osmPlace === 'town') {
          return townStyle
        } else {
          throw new Error(`unknown osmPlace '${osmPlace}'`)
        }
      },
    })
  }

  __onResize() {
    const elem = document.getElementById(this.props.headerElementId)
    const mapElem = this.mapElementRef.current
    if (elem && mapElem) {
      const desiredHeight = window.innerHeight - elem.offsetHeight
      const style = '' + desiredHeight + 'px'
      mapElem.style.height = style
      if (this.map) {
        this.map.updateSize()
      }
    }
  }

  __onMouseLeave() {
    this.props.dispatch({ type: 'pointer left map' })
    const element = this.cursorToolOverlayRef.current
    if (element && element._popover) {
      try {
        element._popover.hide()
        element._popover.dispose()
        element._popover = undefined
      } catch (e) {
        // Popover might already be disposed or in an inconsistent state
        console.warn('Popover disposal error (safe to ignore):', e)
      }
    }
    this.cursorToolVisible = false
  }

  __updateMap() {
    if (this.map == undefined) {
      return
    }
    if (this.__previousIntendedCenter[0] != this.props.intendedCenter[0] ||
      this.__previousIntendedCenter[1] != this.props.intendedCenter[1]) {
      const mapProjection = this.map.getView().getProjection()
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
        new TileLayer({
          // https://cartodb.com/basemaps
          source: new OSMSource({
            attributions: [
              ' &copy; <a href="https://cartodb.com/attributions">CartoDB</a>, ' +
              ' &copy; <a href="https://en.ilmatieteenlaitos.fi/open-data-manual-radar-data">FMI Open Radar Data</a>' +
              ' <a href="https://en.ilmatieteenlaitos.fi/open-data-licence">CC BY 4.0</a>, '
            ],
            url: 'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'
          })
        }),

        new TileLayer({
          // https://cartodb.com/basemaps
          source: new OSMSource({
            url: 'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png'
          })
        }),

        this.__vectorLayer,
      ],
      target: this.mapElementRef.current,
    })

    this.imageCanvas = new ImageCanvas({
      canvasFunction: this.__canvasFunction,
      // Ratio of 1 means the underlying canvas size is exactly the size of
      // the viewport. By default the canvas is larger to make panning
      // seamless. As reprojection is so slow, it makes sense for us to not
      // optimize for panning but for quicker rendering in general.
      ratio: 1
    })
    this.imageLayer = new Image({ source: this.imageCanvas })
    this.map.getLayers().insertAt(1, this.imageLayer);

    const dispatch = this.props.dispatch
    this.map.on('moveend', function (event: MapEvent) {
      const view = event.map.getView()
      const center = view.getCenter()
      const projection = view.getProjection()
      const lonLatCenter = toLonLat(center, projection)

      dispatch({
        type: 'map moved',
        payload: { lon: lonLatCenter[0], lat: lonLatCenter[1] }
      })
    })

    // https://openlayers.org/en/latest/examples/overlay.html
    const cursorToolElement = this.cursorToolOverlayRef.current
    const cursorToolOverlay = new Overlay({ element: cursorToolElement })
    this.cursorToolOverlay = cursorToolOverlay
    this.map.addOverlay(cursorToolOverlay)

    // https://openlayers.org/en/latest/apidoc/module-ol_MapBrowserEvent-MapBrowserEvent.html
    this.map.on('pointermove', (evt: { dragging: boolean, coordinate: Coordinate }) => {
      if (evt.dragging) {
        return
      }

      updateCursorTool(
        cursorToolOverlay,
        this.props.product,
        this.__vectorSource,
        evt.coordinate,
        resolveCursorToolContentAndColors,
        this.wgs84ToProductConversionFn
      )
      this.cursorToolVisible = true

      dispatch({ type: 'pointer moved', payload: evt.coordinate as [number, number] })
      // const pixel = this.map.getEventPixel(evt.originalEvent)
      // const pointerCoords = this.map.getCoordinateFromPixel(pixel)
    })
    this.mapElementRef.current.addEventListener('mouseleave', this.__onMouseLeave)

    this.__resizeTimeout = window.setTimeout(this.__onResize, 200)
    window.addEventListener('resize', this.__onResize)
    this.__updateMap()
  }

  __canvasFunction(
    extent: OlExtent,
    _resolution: number,
    _pixelRatio: number,
    size: Size,
    _projection: Projection
  ): HTMLCanvasElement {
    const startRender = new Date().getTime();

    this.canvas = document.createElement('canvas')
    this.canvas.width = Math.floor(size[0])
    this.canvas.height = Math.floor(size[1])

    // Short-circuit for cached rendering
    const cacheKey = stringify([this.props.productSelection, this.props.productTime,
      extent, this.canvas.width, this.canvas.height])
    const cached = this.__renderedProducts.get(cacheKey)
    if (cached !== undefined) {
      this.canvas = cached
      if (this.cursorToolVisible)
        updateCursorTool(
          this.cursorToolOverlay,
          this.props.product,
          this.__vectorSource,
          undefined,
          resolveCursorToolContentAndColors,
          this.wgs84ToProductConversionFn
        )
      return this.canvas
    }

    if (!this.props.product) {
      console.warn('__canvasFunction not rendering because of null currentProduct')
      return this.canvas
    }

    const data = this.props.product.data
    const dataView = new Uint8Array(data)
    const dataRows = this.props.product._rows
    const metadata = this.props.product.metadata

    // Coloring
    let _resolveColor = null
    if (metadata.productInfo.dataType == 'REFLECTIVITY') {
      _resolveColor = resolveColorForReflectivity
    } else {
      _resolveColor = resolveColorGeneric
    }

    // Use the same color cache between calls
    const colorCacheKey =
      stringify([metadata.productInfo.dataType, metadata.productInfo.dataScale])
    if (!(colorCacheKey in this.__colorCaches)) {
      this.__colorCaches[colorCacheKey] = {}
    }
    const colorCache = this.__colorCaches[colorCacheKey]
    const resolveColor = (value: number) => {
      if (!(value in colorCache)) {
        colorCache[value] = _resolveColor(metadata.productInfo.dataScale, value)
      }
      return colorCache[value]
    }
    // End of coloring

    const ctx = this.canvas.getContext('2d')
    const imageData = ctx.createImageData(this.canvas.width, this.canvas.height)
    const itemsInARow = imageData.width * 4
    const iData = imageData.data

    // Fill efficiently with NOT_SCANNED_COLOR to reduce array manipulation
    fillWithNotScanned(iData)

    const conversionCacheKey = stringify([
      metadata.projectionRef,
      metadata.affineTransform,
      metadata.width, metadata.height,
      'EPSG:3857',
      extent,
      this.canvas.width, this.canvas.height,
    ])

    if (conversionCacheKey != this.conversionCacheKey) {
      this.mapToProductConversionFn = canvasPxToProductPx(
        metadata.projectionRef,
        metadata.affineTransform,
        metadata.width, metadata.height,
        'EPSG:3857',
        extent as Extent,
        this.canvas.width, this.canvas.height,
      )

      this.wgs84ToProductConversionFn = wgs84ToProductPx(
        metadata.projectionRef,
        metadata.affineTransform,
        metadata.width, metadata.height
      )

      this.conversionCacheKey = conversionCacheKey
      console.info('New conversions') // eslint-disable-line no-console
    }

    const fn = this.mapToProductConversionFn
    for (let x = 0; x < this.canvas.width; x++) {
      for (let y = 0; y < this.canvas.height; y++) {
        const dataPxXY = fn(x, y)

        if (dataPxXY[0] == -1) { // out of product bounds
          continue
        }

        const value = dataView[dataPxXY[0] * dataRows + dataPxXY[1]]
        const color = resolveColor(value)

        if (color != NOT_SCANNED_COLOR) {
          const redIndex = (y * itemsInARow) + (x * 4);
          iData[redIndex] = color[0]
          iData[redIndex + 1] = color[1]
          iData[redIndex + 2] = color[2]
          iData[redIndex + 3] = color[3]

          // This will likely get faster in the future but for now it's slow:
          //  https://bugs.chromium.org/p/v8/issues/detail?id=3590&desc=2
          // iData.set(color, redIndex)
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    this.__renderedProducts.set(cacheKey, this.canvas)

    const elapsedMs = new Date().getTime() - startRender;
    const pixelCount = this.canvas.width * this.canvas.height
    console.info('Rendering took', elapsedMs, 'ms @', Math.floor(pixelCount / (elapsedMs / 1000) / 1000), 'kpx/s') // eslint-disable-line no-console

    if (this.cursorToolVisible)
      updateCursorTool(
        this.cursorToolOverlay,
        this.props.product,
        this.__vectorSource,
        undefined,
        resolveCursorToolContentAndColors,
        this.wgs84ToProductConversionFn
      )
    return this.canvas
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.__onResize)
    if (this.mapElementRef.current) {
      this.mapElementRef.current.removeEventListener('mouseleave', this.__onMouseLeave)
    }
    if (this.__resizeTimeout) {
      window.clearTimeout(this.__resizeTimeout)
      this.__resizeTimeout = null
    }
    if (this.map) {
      this.map.setTarget(null)
      this.map = null
      this.__previousIntendedCenter = [0, 0]
    }
  }

  render() {
    if (
      this.props.geoInterests &&
      Object.keys(this.props.geoInterests).length > 0 &&
      this.__vectorSource.getFeatures().length == 0
    ) {
      const features = new GeoJSON({ featureProjection: 'EPSG:3857' })
        .readFeatures(this.props.geoInterests)
      this.__vectorSource.addFeatures(features)
    }

    if (this.__previousProduct != this.props.product) {
      this.__previousProduct = this.props.product
      if (this.imageCanvas) {
        this.imageCanvas.changed()
      }
    }

    this.__updateMap()

    return (
      <React.Fragment>
        <div id="map-element" ref={this.mapElementRef}></div>
        <div id="cursor-tool-overlay" ref={this.cursorToolOverlayRef}></div>
      </React.Fragment>
    )
  }
}
