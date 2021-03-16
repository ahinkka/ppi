import React from 'react'
import moment from 'moment';
import { connect } from 'react-redux'

import * as R from 'ramda'
import * as L from 'partial.lenses'
import {
  catalogL,
  radarProductsL,
  poisL,
  selectedSiteIdL,
  selectedProductIdL,
  selectedFlavorIdL,
  selectedSiteL,
  selectedProductL,
  selectedFlavorL,
  animationRunningL,
  currentLonL,
  currentLatL,
  intendedLonL,
  intendedLatL,
  loadedProductsL,
  currentProductTimeL
} from '../state_reduction'

import {ObserverActions} from '../constants'

import DropdownSelector from './dropdown_selector'
import {Map} from './map.js'
import ToggleButton from './toggle_button'
import ProductSlider from './product_slider'
import ColorScale from './color_scale'
import {NOAAScaleToScaleDescription} from './coloring'

const _NOAAReflectivityColorScale = NOAAScaleToScaleDescription()


const siteSelections = (radarProducts) => {
  const result = []
  for (const siteId in radarProducts) {
    result.push({id: siteId, display: radarProducts[siteId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const productSelections = (site) => {
  const result = []
  for (const productId in site.products) {
    result.push({id: productId, display: site.products[productId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const flavorSelections = (product) => {
  const result = []
  for (const flavorId in product.flavors) {
    result.push({id: flavorId, display: product.flavors[flavorId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}


const handleKeyPress = (dispatch, event) => {
  const key = String.fromCharCode(event.charCode)
  if (key == 's' || key == 'S') {
    dispatch({type: ObserverActions.CYCLE_SITE})
  } else if (key == 'p' || key == 'P') {
    dispatch({type: ObserverActions.CYCLE_PRODUCT})
  } else if (key == 'f' || key == 'F') {
    dispatch({type: ObserverActions.CYCLE_FLAVOR})
  } else if (event.keyCode == 32) {
    dispatch({type: ObserverActions.TOGGLE_ANIMATION})
  }

  // TODO: bind shift + arrows for navigating the map
  // TODO: bind + and - for zooming the map
}


const handleKeyDown = (dispatch, event) => {
  const key = event.key
  if (key == 'ArrowRight') {
    dispatch({type: ObserverActions.TICK_FORWARD})
  } else if (key == 'ArrowLeft') {
    dispatch({type: ObserverActions.TICK_BACKWARD})
  }
}


const TimeDisplay = (props) => {
  const display = moment.utc(props.currentValue).format('YYYY-MM-DD HH:mm:ss') + ' UTC'
  const title = 'Current displayed product time is ' + display
  return (
    <div title={title} className="h5" id="product-time">{display}</div>
  );
}


class ObserverApp extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this._animationTick = () =>
      L.get(animationRunningL, this.props) ? this.props.dispatch({type: ObserverActions.ANIMATION_TICK}) : undefined

    setTimeout(this._animationTick, 500)
    this.animationTimerToken = setInterval(this._animationTick, 1500)

    this._onKeyPress = (event) => handleKeyPress(this.props.dispatch, event)
    this._onKeyDown = (event) => handleKeyDown(this.props.dispatch, event)
    document.addEventListener('keypress', this._onKeyPress)
    document.addEventListener('keydown', this._onKeyDown)
  }

  componentWillUnmount() {
    document.removeEventListener('keypress', this._onKeyPress)
    document.removeEventListener('keydown', this._onKeyDown)
  }

  render() {
    const props = this.props
    const [siteId, productId, flavorId] = [
      L.get(selectedSiteIdL, props),
      L.get(selectedProductIdL, props),
      L.get(selectedFlavorIdL, props)
    ]

    if (!siteId || !productId || !flavorId) {
      return (<div></div>)
    }

    const flavor = L.get(selectedFlavorL, props)
    const currentProductTime = L.get(currentProductTimeL, props)
    const productUrl = props.productUrlResolver(flavor, currentProductTime)

    const tickClickCallback = (time) => {
      return () =>  props.dispatch({ type: ObserverActions.TICK_CLICKED, payload: time })
    }

    const keyBase = [siteId, productId, flavorId]
    const tickItems = flavor.times.map((flavorTime) => {
      const time = Date.parse(flavorTime.time)
      const callback = tickClickCallback(time)
      const isCurrent = time === currentProductTime
      const isLoaded = !R.isNil(props.getProductByUrl(props.productUrlResolver(props.selection.flavor, time)))
      const key = [...keyBase, flavorTime.time]
      return { time, callback, isCurrent, isLoaded, key }
    })

    let product = null
    if (productUrl in props.loadedProducts) {
      product = props.getProductByUrl(productUrl)
    }

    return (
      <div>
        <div id="header-row">
          <div id="header-row__selector-container">
            <DropdownSelector className="header-row__site-selector"
              currentValue={props.selection.siteId}
              legend="Site"
              items={siteSelections(L.get(radarProductsL, props))}
              tooltip="Press S to cycle sites"
              action={ObserverActions.SITE_SELECTED}
              dispatch={props.dispatch} />
            <DropdownSelector className="header-row__product-selector"
              currentValue={props.selection.productId}
              legend="Product"
              items={productSelections(props.selection.site)}
              tooltip="Press P to cycle products"
              action={ObserverActions.PRODUCT_SELECTED}
              dispatch={props.dispatch} />
            <DropdownSelector className="header-row__flavor-selector"
              currentValue={props.selection.flavorId}
              legend="Flavor"
              items={flavorSelections(props.selection.product)}
              tooltip="Press F to cycle flavors"
              action={ObserverActions.FLAVOR_SELECTED}
              dispatch={props.dispatch} />
          </div>
          <div id="play-controls">
            <ToggleButton toggleStatus={props.animation.running} dispatch={props.dispatch}
              onSymbol="&#9616;&nbsp;&#9612;" offSymbol="&nbsp;&#9658;&nbsp;"
              action={ObserverActions.TOGGLE_ANIMATION}
              tooltip="Press SPACE to toggle animation" />
            <ProductSlider ticks={tickItems} />
          </div>
          <TimeDisplay currentValue={props.animation.currentProductTime} />
        </div>
        <Map headerElementId="header-row"
          intendedCenter={[props.map.intended.centerLon, props.map.intended.centerLat]}
          pois={L.get(poisL, props)}
          dispatch={props.dispatch}
          product={product}
          productTime={props.animation.currentProductTime}
          productSelection={[props.selection.siteId, props.selection.productId, props.selection.flavorId]} />
        <ColorScale name={'NOAA Reflectivity Scale'} unit={'dBZ'} type={'Reflectivity'}
          ranges={_NOAAReflectivityColorScale} />
      </div>
    )
  }
}


const mapStateToProps = (state) => {
  const result = [
    catalogL,
    selectedSiteIdL,
    selectedProductIdL,
    selectedFlavorIdL,
    selectedSiteL,
    selectedProductL,
    selectedFlavorL,
    animationRunningL,
    currentLonL,
    currentLatL,
    intendedLonL,
    intendedLatL,
    loadedProductsL,
    currentProductTimeL
  ].reduce(
    (acc, lens) => L.set(lens, L.get(lens, state), acc),
    {}
  )

  return result
}
export default connect(mapStateToProps)(ObserverApp)
