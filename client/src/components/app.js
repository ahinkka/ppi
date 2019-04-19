import React from 'react'
import pako from 'pako';

import {httpGetPromise, objectEquals} from '../utils'
import {ObserverActions} from '../constants'

import {makeHashFromState} from '../state_hash'
import {DropdownSelector} from './dropdown_selector'
import {Map} from './map.js'
import {ToggleButton} from './toggle_button'
import {ProductSlider} from './product_slider'
import {ColorScale} from './color_scale'
import {NOAAScaleToScaleDescription} from './coloring'


let _NOAAReflectivityColorScale = NOAAScaleToScaleDescription()


const inflate = (stream) => {
  try {
    return pako.inflate(stream, { to: 'string' })
  } catch (err) {
    console.log('Error while decompressing product file:', err);
  }
}


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


class TimeDisplay extends React.Component {
  render() {
    let isoString = new Date(this.props.currentValue).toISOString()
    let title = 'Current displayed product time is ' + isoString
    return (
      <div title={title} className="h5">{isoString}</div>
    );
  }
}


export class ObserverApp extends React.Component {
  constructor(props) {
    super(props);
    console.log('ObserverApp.constructor()')

    let state = this.props.store.getState()

    this.__loadingProducts = {}
    this.__loadedProducts = {}

    this.onKeyPress = this.onKeyPress.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.initializeKeyboardListener = this.initializeKeyboardListener.bind(this);
    this.removeKeyboardListener = this.removeKeyboardListener.bind(this);

    this.loadProducts = this.loadProducts.bind(this);
    this.animationTick = this.animationTick.bind(this);
    this.storeChanged = this.storeChanged.bind(this);
  }

  componentWillMount() {
  }

  componentDidMount() {
    console.log('ObserverApp.componentDidMount()')
    this._dispatch = this.props.store.dispatch.bind(this);
    this._unsubscribe = this.props.store.subscribe(this.storeChanged).bind(this);

    setTimeout(this.animationTick, 500)
    this.animationTimerToken = setInterval(this.animationTick, 1500)

    this.initializeKeyboardListener()
  }

  componentWillUnmount() {
    console.log('ObserverApp.componentDidUnmount()')
    this._unsubscribe();
    this.removeKeyboardListener()
  }

  storeChanged() {
    this.setState(this.props.store.getState());
    this.forceUpdate();
  }

  onKeyDown(event) {
    let key = event.key
    if (key == 'ArrowRight') {
      this._dispatch({type: ObserverActions.TICK_FORWARD})
    } else if (key == 'ArrowLeft') {
      this._dispatch({type: ObserverActions.TICK_BACKWARD})
    }
  }

  onKeyPress(event) {
    let key = String.fromCharCode(event.charCode);
    if (key == 's' || key == 'S') {
      this._dispatch({type: ObserverActions.CYCLE_SITE})
    } else if (key == 'p' || key == 'P') {
      this._dispatch({type: ObserverActions.CYCLE_PRODUCT})
    } else if (key == 'f' || key == 'F') {
      this._dispatch({type: ObserverActions.CYCLE_FLAVOR})
    } else if (event.keyCode == 32) {
      this._dispatch({type: ObserverActions.TOGGLE_ANIMATION})
    }

    // TODO: bind shift + arrows for navigating the map
    // TODO: bind + and - for zooming the map
  }

  loadProducts() {
    let store = this.props.store;
    let state = store.getState();

    let flavor = state.selection.flavor

    if (flavor == null) {
      return
    }


    let intendedUrls = new Set()
    let removedUrls = new Set()
    for (const i in flavor.times) {
      intendedUrls.add(this.props.productUrlResolver(flavor, Date.parse(flavor.times[i].time)))
    }
    const currentlyLoaded = new Set(Object.keys(this.__loadedProducts))
    for (const url of currentlyLoaded) {
      if (!intendedUrls.has(url)) {
        delete this.__loadedProducts[url];
        removedUrls.add(url)
      }
    }

    // Then start loading actual products
    let tmp = this;
    for (const url of intendedUrls) {
      if (!(url in this.__loadedProducts) && !(url in this.__loadingProducts)) {
        this.__loadingProducts[url] = new Date()
        httpGetPromise(url, true)
          .then((resp) => {
            let inflated = null;
            let parsed = null;
            try {
              inflated = inflate(resp)
              parsed = JSON.parse(inflated)
            } catch (e) {
              delete this.__loadingProducts[url];
              if (e instanceof SyntaxError) {
                // TODO: properly handle
                console.log('Error parsing ' + url + ': ' + e + ' with input ' +
                            inflated.substring(0, 20) +
                            ' ... ' +
                            inflated.substring(inflated.length - 20, inflated.length - 1))
                return
              } else {
                // TODO: properly handle
                console.warn('Unhandled exception during product load', e)
                throw e
              }
            }
            delete this.__loadingProducts[url];
            this.__loadedProducts[url] = parsed;
            tmp._dispatch({type: ObserverActions.PRODUCT_LOAD_UPDATE, payload: {loaded: [url], unloaded: new Array(removedUrls)}})
          })
          .catch((reason) => {
          // TODO: properly handle
            console.warn('Couldn\'t load product ', reason)
          })
        setTimeout(this.loadProducts, 500)
        break
      }
    }
  }

  animationTick() {
    if (this.props.store.getState().animation.running == false) {
      return
    }
    this._dispatch({type: ObserverActions.ANIMATION_TICK})
  }

  initializeKeyboardListener() {
    document.addEventListener('keypress', this.onKeyPress)
    document.addEventListener('keydown', this.onKeyDown)
  }

  removeKeyboardListener() {
    document.removeEventListener('keypress', this.onKeyPress)
    document.removeEventListener('keydown', this.onKeyDown)
  }

  render() {
    let store = this.props.store;
    let state = store.getState();

    this.loadProducts()
    if (state.selection.siteId == null ||
        state.selection.productId == null ||
        state.selection.flavorId == null) {
      return (<div></div>)
    }

    let hash = makeHashFromState(state)
    if (hash != window.location.hash) {
      let hashLess = window.location.href
      if (window.location.href.includes('#')) {
        hashLess = window.location.href.split('#')[0]
      }
      window.history.pushState(null, null, hashLess + hash)
    }

    let tickItems = []
    const flavorTimes = state.selection.flavor.times
    const minTime = Date.parse(flavorTimes[0].time)
    const maxTime = Date.parse(flavorTimes[flavorTimes.length-1].time)
    const spanMillis = maxTime - minTime
    for (let i=0; i<flavorTimes.length; i++) {
      const t = flavorTimes[i]
      const time = Date.parse(t.time)
      const fromStartMillis = time - minTime
      const proportion = fromStartMillis / spanMillis

      let color = '#ffffff'

      if (time === state.animation.currentProductTime) {
        color = '#000000'
      } else {
        const url = this.props.productUrlResolver(state.selection.flavor, time)
        if (url in state.loadedProducts) {
          color = '#c0c0c0'
        }
      }

      tickItems.push({
        position: proportion,
        color: color,
        tooltip: t.time,
        action: ObserverActions.TICK_CLICKED,
        payload: time
      })
    }


    let productUrl = this.props.productUrlResolver(state.selection.flavor,
      state.animation.nextProductTime)

    let product = null
    if (productUrl in state.loadedProducts) {
      product = this.__loadedProducts[productUrl]
    }

    return (
      <div>
        <div id="product-selection-row" className="row">
          <div className="col-md-4">
            <form className="form-inline">
              <DropdownSelector currentValue={state.selection.siteId}
                legend="Site"
                items={siteSelections(state.catalog)}
                tooltip="Press R to cycle sites"
                action={ObserverActions.SITE_SELECTED}
                dispatch={store.dispatch} />
              <DropdownSelector currentValue={state.selection.productId}
                legend="Product"
                items={productSelections(state.selection.site)}
                tooltip="Press P to cycle products"
                action={ObserverActions.PRODUCT_SELECTED}
                dispatch={store.dispatch} />
              <DropdownSelector currentValue={state.selection.flavorId}
                legend="Flavor"
                items={flavorSelections(state.selection.product)}
                tooltip="Press F to cycle flavors"
                action={ObserverActions.FLAVOR_SELECTED}
                dispatch={store.dispatch} />
            </form>
          </div>
          <div className="col-md-1">
            <div className="float-right">
              <ToggleButton toggleStatus={state.animation.running} dispatch={store.dispatch}
                onSymbol="&#9616;&nbsp;&#9612;" offSymbol="&nbsp;&#9658;&nbsp;"
                action={ObserverActions.TOGGLE_ANIMATION}
                tooltip="Press SPACE to toggle animation" />
            </div>
          </div>
          <div className="col-md-3 py-2">
            <ProductSlider ticks={tickItems}
              dispatch={store.dispatch} />
          </div>
          <div className="col-md-2 py-2">
            <TimeDisplay currentValue={state.animation.currentProductTime} />
          </div>
        </div>
        <Map headerElementId="product-selection-row"
          intendedCenter={[state.map.intended.centerLon, state.map.intended.centerLat]}
          dispatch={store.dispatch}
          product={product}
          productTime={state.animation.nextProductTime}
          productSelection={[state.selection.siteId, state.selection.productId, state.selection.flavorId]} />
        <ColorScale name={'NOAA Reflectivity Scale'} unit={'dBZ'} type={'Reflectivity'}
          ranges={_NOAAReflectivityColorScale} />
      </div>
    )
  }
}
