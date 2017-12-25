import React from "react"

import {httpGetPromise, objectEquals} from "../utils"
import {ObserverActions} from "../constants"

import {DropdownSelector} from "./dropdown_selector"
import {Map, CenterState} from "./map.js"
import {PlayButton} from "./play_button"


const radarSelections = (radars) => {
  let result = []
  for (let key in radars) {
    result.push(radars[key])
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const productSelections = (products, radar) => {
  let result = []
  for (let key in products) {
    let product = products[key]
    if (product.radar == radar.id) {
      result.push(Object.assign({id: key, display: product.name}, product))
    }
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const flavorSelections = (product) => {
  let result = []
  for (let key in product.flavors) {
    result.push({id: key, display: key})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}


class TimeDisplay extends React.Component {
  render() {
    let isoString = new Date(this.props.currentValue).toISOString()
    let title = "Current displayed product time is " + isoString
    return (
      <div title={title} className="h5">{isoString}</div>
    );
  }
}


export class ObserverApp extends React.Component {
  constructor(props) {
    super(props);
    console.log("ObserverApp.constructor()")

    let state = this.props.store.getState()
    this._mapCenter = {change: CenterState.CHANGE,
		       coordinates: [state.map.centerLon, state.map.centerLat]}

    this._onKeyPress = this._onKeyPress.bind(this);
    this.initializeKeyboardListener = this.initializeKeyboardListener.bind(this);
    this.removeKeyboardListener = this.removeKeyboardListener.bind(this);
    this.fetchIndex = this.fetchIndex.bind(this);
    this.animationTick = this.animationTick.bind(this);
    this.storeChanged = this.storeChanged.bind(this);
  }

  componentWillMount() {
  }

  componentDidMount() {
    console.log("ObserverApp.componentDidMount()")
    this._dispatch = this.props.store.dispatch.bind(this);
    this._unsubscribe = this.props.store.subscribe(this.storeChanged).bind(this);

    setTimeout(this.fetchIndex, 250)
    this.indexTimerToken = setInterval(this.fetchIndex, 50000)

    setTimeout(this.animationTick, 500)
    this.animationTimerToken = setInterval(this.animationTick, 2500)

    this.initializeKeyboardListener()
  }

  componentWillUnmount() {
    console.log("ObserverApp.componentDidUnmount()")
    this._unsubscribe();
    this.removeKeyboardListener()
    clearInterval(this.indexTimerToken)
  }

  storeChanged() {
    this.setState(this.props.store.getState());

    let state = this.props.store.getState()
    if (state.map.onRadar == true) {
      this._mapCenter = {change: CenterState.CHANGE,
			 coordinates: [state.map.centerLon, state.map.centerLat]}
    } else {
      this._mapCenter = {change: CenterState.NO_CHANGE,
			 coordinates: [state.map.centerLon, state.map.centerLat]}
    }

    this.forceUpdate();
  }

  _onKeyPress(event) {
    let key = String.fromCharCode(event.charCode);
    if (key == "r" || key == "R") {
      this._dispatch({type: ObserverActions.CYCLE_RADAR})
    } else if (key == "p" || key == "P") {
      this._dispatch({type: ObserverActions.CYCLE_PRODUCT})
    } else if (key == "f" || key == "F") {
      this._dispatch({type: ObserverActions.CYCLE_FLAVOR})
    } else if (event.keyCode == 32) {
      this._dispatch({type: ObserverActions.TOGGLE_ANIMATION})
    }

    // TODO: bind left and right for navigating products
    // TODO: bind shift + arrows for navigating the map
    // TODO: bind + and - for zooming the map
  }


  fetchIndex() {
    httpGetPromise(this.props.url)
      .then(JSON.parse)
      .then((obj) => {
        this._dispatch({type: ObserverActions.INDEX_UPDATED, payload: obj})
      })
  }

  animationTick() {
    if (this.props.store.getState().animation.running == false) {
      return
    }
    this._dispatch({type: ObserverActions.ANIMATION_TICK})
  }

  initializeKeyboardListener() {
    document.addEventListener("keypress", this._onKeyPress)
  }

  removeKeyboardListener() {
    document.removeEventListener("keypress", this._onKeyPress)
  }

  render() {
    let store = this.props.store;
    let state = store.getState();

    // console.log("ObserverApp.render()", state.selection);
    // console.log("r", this._mapCenter.coordinates)
    if (state.selection.radar == null ||
        state.selection.product == null ||
	state.selection.flavor == null) {
      return (<div></div>)
    }

    // <div className="container-fluid">
    let productUrl = this.props.productUrlResolver(state,
						   state.selection.radar.id,
						   state.selection.product.id,
						   state.selection.flavor.id,
						   state.animation.nextProductTime)

    return (
      <div>
        <div id="product-selection-row" className="row">
          <div className="col-md-6">
          <form className="form-inline">
            <DropdownSelector currentValue={state.selection.radar.id}
                              legend="Radar"
                              items={radarSelections(state.index.radars)}
                              tooltip="Press R to cycle radars"
                              action={ObserverActions.RADAR_SELECTED}
	                      dispatch={store.dispatch} />
            <DropdownSelector currentValue={state.selection.product.id}
                              legend="Product"
                              items={productSelections(state.index.products, state.selection.radar)}
                              tooltip="Press P to cycle products"
                              action={ObserverActions.PRODUCT_SELECTED}
	                      dispatch={store.dispatch} />
            <DropdownSelector currentValue={state.selection.flavor.id}
                              legend="Flavor"
                              items={flavorSelections(state.selection.product)}
                              tooltip="Press F to cycle flavors"
                              action={ObserverActions.FLAVOR_SELECTED}
	                      dispatch={store.dispatch} />
          </form>
          </div>
          <div className="col-md-1">
            <PlayButton animationRunning={state.animation.running} dispatch={store.dispatch} />
          </div>
	  <div className="col-md-2">
            <TimeDisplay currentValue={state.animation.currentProductTime} />
          </div>
        </div>
        <Map headerElementId="product-selection-row"
             center={this._mapCenter}
             dispatch={this._dispatch}
             productUrl={productUrl}
             productTime={state.animation.nextProductTime} />
      </div>
    )
  }
}
