import React from 'react'
import moment from 'moment';

import {ObserverActions} from '../constants'

import {makeHashFromState} from '../state_hash'
import {DropdownSelector} from './dropdown_selector'
import {Map} from './map.js'
import ToggleButton from './toggle_button'
import {ProductSlider} from './product_slider'
import {ColorScale} from './color_scale'
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


export class ObserverApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {animationTime: new Date()}

    this.__loadingProducts = {}
    this.__loadedProducts = {}
  }

  componentDidMount() {
    this._dispatch = this.props.store.dispatch.bind(this);

    this._storeChanged = () => this.setState(this.props.store.getState())
    this._unsubscribe = this.props.store.subscribe(this._storeChanged).bind(this)

    const animationCallback = (() => {
      this.setState((state, props) => {
        if (!this.props.store.getState().animation.running) {
          return
        }

        const currentAnimationTime = state.animationTime
        let nextAnimationTime = new Date(currentAnimationTime.getTime() + 5 * 60 * 1000)

        const flavor = props.store.getState().selection.flavor
        if (!flavor) {
          console.warn("no flavor, not animating by time", flavor)
          return
        }

        const maxAnimationTime = resolveMaxAnimationTime(flavor.times)
        if (nextAnimationTime > maxAnimationTime) {
          nextAnimationTime = resolveMinAnimationTime(flavor.times)
        }

        setTimeout(() => this.props.store.dispatch({
          type: ObserverActions.ANIMATION_TIMER_TICK,
          animationTime: nextAnimationTime
        }), 0)

        return {animationTime: nextAnimationTime}
      })
    })
    this._animationTimerToken = setInterval(animationCallback, 500)

    this._onKeyPress = (event) => handleKeyPress(this._dispatch, event)
    this._onKeyDown = (event) => handleKeyDown(this._dispatch, event)
    document.addEventListener('keypress', this._onKeyPress)
    document.addEventListener('keydown', this._onKeyDown)
  }

  componentWillUnmount() {
    this._unsubscribe()
    clearInterval(this._animationTimerToken)

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

    let tickItems = []
    const flavorTimes = state.selection.flavor.times
    const minTime = resolveMinAnimationTime(flavorTimes)
    const maxTime = resolveMaxAnimationTime(flavorTimes)
    const spanMillis = maxTime - minTime

    tickItems.push({
      key: this.state.animationTime,
      position: (this.state.animationTime - minTime) / spanMillis,
      color: '#FF0000',
      character: '⬤',
      tooltip: renderTooltip(this.state.animationTime),
      clicked: () => {}
    })

    for (let i=0; i<flavorTimes.length; i++) {
      const t = flavorTimes[i]
      const time = Date.parse(t.time)
      const fromStartMillis = time - minTime
      const proportion = fromStartMillis / spanMillis

      let character = '▏'
      let color = '#e0e0e0'

      if (time === state.animation.currentProductTime) {
        color = '#000000'
        character = '▎'
      } else {
        const url = this.props.productUrlResolver(state.selection.flavor, time)
        if (url in state.loadedProducts) {
          color = '#808080'
        }
      }

      tickItems.push({
        key: [state.selection.site, state.selection.product, state.selection.flavor, t.time].join('|'),
        position: proportion,
        color: color,
        character: character,
        tooltip: renderTooltip(t.time),
        clicked: () => tickClickCallback(time)
      })
    }

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
