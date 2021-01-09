import React from 'react'
import moment from 'moment';
import { connect } from 'react-redux'

import * as L from 'partial.lenses'
import {
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
} from '../state_reduction'

import {ObserverActions} from '../constants'

import DropdownSelector from './dropdown_selector'
import {Map} from './map.js'
import ToggleButton from './toggle_button'
import ProductSlider from './product_slider'
import ColorScale from './color_scale'
import {NOAAScaleToScaleDescription} from './coloring'

const _NOAAReflectivityColorScale = NOAAScaleToScaleDescription()


const siteSelections = (catalog) => {
  const result = []
  for (const siteId in catalog) {
    result.push({id: siteId, display: catalog[siteId].display})
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


const resolveMinAnimationTime = (times) => {
  if (times.length == 0) {
    return null
  }

  // Only time - 5 minutes
  if (times.length == 1) {
    return new Date(Date.parse(times[0].time) - 5 * 60 * 1000)
  }

  // Use the product interval from the first two products
  const firstTime = Date.parse(times[0].time)
  const secondTime = Date.parse(times[1].time)
  return new Date(firstTime - (secondTime - firstTime))
}


const resolveMaxAnimationTime = (times) => {
  if (times.length == 0) {
    return null
  }

  // Only time + 5 minutes
  if (times.length == 1) {
    return new Date(Date.parse(times[0]) + 5 * 60 * 1000)
  }

  // Use the product interval from the last two products
  const secondToLastTime = Date.parse(times[times.length - 2].time)
  const lastTime = Date.parse(times[times.length - 1].time)
  return new Date(lastTime + (lastTime - secondToLastTime) / 1000)
}


const renderTooltip = (time) => {
  const utcTime = moment.utc(time)
  const minutes = moment.duration(moment(new Date()).diff(utcTime)).asMinutes()
  const displayHours = Math.floor(minutes / 60)
  const displayMinutes = Math.floor(minutes - displayHours * 60)
  return utcTime.format('YYYY-MM-DD HH:mm:ss') + `UTC (${displayHours} hours, ${displayMinutes} minutes ago)`
}


const resolveTickItems = (flavorTimes, isTimeLoaded, currentProductTime, tickKey, tickClickCallback) => {
  const result = []

  const minTime = resolveMinAnimationTime(flavorTimes)
  const maxTime = resolveMaxAnimationTime(flavorTimes)
  const spanMillis = maxTime - minTime
  for (let i=0; i<flavorTimes.length; i++) {
    const t = flavorTimes[i]
    const time = Date.parse(t.time)
    const fromStartMillis = time - minTime
    const proportion = fromStartMillis / spanMillis

    let character = '▏'
    let color = '#e0e0e0'

    if (time === currentProductTime) {
      color = '#000000'
      character = '▎'
    } else {
      if (isTimeLoaded(time)) {
        color = '#808080'
      }
    }

    result.push({
      key: tickKey(t.time),
      position: proportion,
      color: color,
      character: character,
      tooltip: renderTooltip(t.time),
      clicked: () => tickClickCallback(time)
    })
  }

  return result
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

    if (L.get(selectedSiteIdL, props) == null ||
      L.get(selectedProductIdL, props) == null ||
      L.get(selectedFlavorIdL, props) == null) {
      return (<div></div>)
    }

    const tickClickCallback = (time) => {
      props.dispatch({
        type: ObserverActions.TICK_CLICKED,
        payload: time
      })
      this.setState({animationTime: new Date(time)})
    }

    const flavorTimes = props.selection.flavor.times
    const tickItems = resolveTickItems(
      flavorTimes,
      (time) =>
	(props.productUrlResolver(props.selection.flavor, time) in props.loadedProducts),
      props.animation.currentProductTime,
      (t) => [props.selection.site.display, props.selection.product.display, props.selection.flavor.display, t].join('|'),
      tickClickCallback
    )

    const productUrl = props.productUrlResolver(props.selection.flavor, props.animation.currentProductTime)

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
              items={siteSelections(props.catalog)}
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
            <ProductSlider ticks={tickItems} dispatch={props.dispatch} />
          </div>
          <TimeDisplay currentValue={props.animation.currentProductTime} />
        </div>
        <Map headerElementId="header-row"
          intendedCenter={[props.map.intended.centerLon, props.map.intended.centerLat]}
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
