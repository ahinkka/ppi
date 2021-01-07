import React from 'react'
import moment from 'moment';

import {ObserverActions} from '../constants'

import {makeHashFromState} from '../state_hash'
import DropdownSelector from './dropdown_selector'
import {Map} from './map.js'
import ToggleButton from './toggle_button'
import ProductSlider from './product_slider'
import ColorScale from './color_scale'
import {NOAAScaleToScaleDescription} from './coloring'
import {loadProducts} from '../product_loading'

let _NOAAReflectivityColorScale = NOAAScaleToScaleDescription()


const siteSelections = (catalog) => {
  let result = []
  for (const siteId in catalog) {
    result.push({id: siteId, display: catalog[siteId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const productSelections = (site) => {
  let result = []
  for (const productId in site.products) {
    result.push({id: productId, display: site.products[productId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const flavorSelections = (product) => {
  let result = []
  for (const flavorId in product.flavors) {
    result.push({id: flavorId, display: product.flavors[flavorId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}


const handleKeyPress = (dispatch, event) => {
  let key = String.fromCharCode(event.charCode)
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
  let key = event.key
  if (key == 'ArrowRight') {
    dispatch({type: ObserverActions.TICK_FORWARD})
  } else if (key == 'ArrowLeft') {
    dispatch({type: ObserverActions.TICK_BACKWARD})
  }
}


const TimeDisplay = (props) => {
  let display = moment.utc(props.currentValue).format('YYYY-MM-DD HH:mm:ss') + ' UTC'
  let title = 'Current displayed product time is ' + display
  return (
    <div title={title} className="h5" id="product-time">{display}</div>
  );
}


const _loadProducts = (dispatch, store, productUrlResolver, loadedProducts, loadingProducts) => {
  const state = store.getState()
  const flavor = state.selection.flavor

  if (dispatch == null ||
      state.selection.siteId == null ||
      state.selection.productId == null ||
      state.selection.flavorId == null) {
    return
  }

  const moreProducts = loadProducts(
    dispatch,
    productUrlResolver,
    loadedProducts,
    loadingProducts,
    flavor
  )

  if (moreProducts) {
    setTimeout(() => _loadProducts(
      dispatch,
      store,
      productUrlResolver,
      loadedProducts,
      loadingProducts
    ), 500)
  }
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


export class ObserverApp extends React.Component {
  constructor(props) {
    super(props);

    this.__loadingProducts = {}
    this.__loadedProducts = {}
  }

  componentDidMount() {
    this._dispatch = this.props.store.dispatch.bind(this);

    this._storeChanged = () => this.setState(this.props.store.getState())
    this._unsubscribe = this.props.store.subscribe(this._storeChanged).bind(this)

    this._animationTick = () =>
      this.props.store.getState().animation.running ? this._dispatch({type: ObserverActions.ANIMATION_TICK}) : undefined

    setTimeout(this._animationTick, 500)
    this.animationTimerToken = setInterval(this._animationTick, 1500)

    this._onKeyPress = (event) => handleKeyPress(this._dispatch, event)
    this._onKeyDown = (event) => handleKeyDown(this._dispatch, event)
    document.addEventListener('keypress', this._onKeyPress)
    document.addEventListener('keydown', this._onKeyDown)
  }

  componentWillUnmount() {
    this._unsubscribe()

    document.removeEventListener('keypress', this._onKeyPress)
    document.removeEventListener('keydown', this._onKeyDown)
  }

  render() {
    let store = this.props.store;
    let state = store.getState();

    if (state.selection.siteId == null ||
        state.selection.productId == null ||
        state.selection.flavorId == null) {
      return (<div></div>)
    }

    _loadProducts(
      this._dispatch,
      store,
      this.props.productUrlResolver,
      this.__loadedProducts,
      this.__loadingProducts
    )

    let hash = makeHashFromState(state)
    if (hash != window.location.hash) {
      let hashLess = window.location.href
      if (window.location.href.includes('#')) {
        hashLess = window.location.href.split('#')[0]
      }
      window.history.pushState(null, null, hashLess + hash)
    }

    const tickClickCallback = (time) => {
      this._dispatch({
        type: ObserverActions.TICK_CLICKED,
        payload: time
      })
      this.setState({animationTime: new Date(time)})
    }

    const flavorTimes = state.selection.flavor.times
    const tickItems = resolveTickItems(
      flavorTimes,
      (time) =>
	((this.props.productUrlResolver(state.selection.flavor, time)) in state.loadedProducts),
      state.animation.currentProductTime,
      (t) => [state.selection.site.display, state.selection.product.display, state.selection.flavor.display, t].join('|'),
      tickClickCallback
    )

    let productUrl = this.props.productUrlResolver(state.selection.flavor, state.animation.currentProductTime)

    let product = null
    if (productUrl in state.loadedProducts) {
      product = this.__loadedProducts[productUrl]
    }

    return (
      <div>
        <div id="header-row">
          <div id="header-row__selector-container">
            <DropdownSelector className="header-row__site-selector"
              currentValue={state.selection.siteId}
              legend="Site"
              items={siteSelections(state.catalog)}
              tooltip="Press S to cycle sites"
              action={ObserverActions.SITE_SELECTED}
              dispatch={store.dispatch} />
            <DropdownSelector className="header-row__product-selector"
              currentValue={state.selection.productId}
              legend="Product"
              items={productSelections(state.selection.site)}
              tooltip="Press P to cycle products"
              action={ObserverActions.PRODUCT_SELECTED}
              dispatch={store.dispatch} />
            <DropdownSelector className="header-row__flavor-selector"
              currentValue={state.selection.flavorId}
              legend="Flavor"
              items={flavorSelections(state.selection.product)}
              tooltip="Press F to cycle flavors"
              action={ObserverActions.FLAVOR_SELECTED}
              dispatch={store.dispatch} />
          </div>
          <div id="play-controls">
            <ToggleButton toggleStatus={state.animation.running} dispatch={store.dispatch}
              onSymbol="&#9616;&nbsp;&#9612;" offSymbol="&nbsp;&#9658;&nbsp;"
              action={ObserverActions.TOGGLE_ANIMATION}
              tooltip="Press SPACE to toggle animation" />
            <ProductSlider ticks={tickItems} dispatch={store.dispatch} />
          </div>
          <TimeDisplay currentValue={state.animation.currentProductTime} />
        </div>
        <Map headerElementId="header-row"
          intendedCenter={[state.map.intended.centerLon, state.map.intended.centerLat]}
          dispatch={store.dispatch}
          product={product}
          productTime={state.animation.currentProductTime}
          productSelection={[state.selection.siteId, state.selection.productId, state.selection.flavorId]} />
        <ColorScale name={'NOAA Reflectivity Scale'} unit={'dBZ'} type={'Reflectivity'}
          ranges={_NOAAReflectivityColorScale} />
      </div>
    )
  }
}
