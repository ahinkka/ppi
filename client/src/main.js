import React from "react"
import ReactDOM from "react-dom"
import {createStore} from 'redux'

import {httpGetPromise} from "./utils"
import {ObserverApp} from "./components/app"
import {ObserverActions} from "./constants"
import {parseHash} from "./state_hash"
import {reducer} from "./state_reduction"

let store = createStore(reducer,
			window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__())
store.dispatch({type: ObserverActions.PRIME})


const productUrlResolver = (flavor, time) => {
  let urlPrefix = 'data/'

  if (flavor === undefined || flavor == null || time == null) {
    console.warn("No URL found for flavor:", flavor, ", time:", time)
    return null
  }

  // TODO: when a new catalog comes in, parse the times
  let tmp = flavor.times.find((x) => Date.parse(x.time) == time)
  if (tmp !== undefined) {
    return urlPrefix + tmp.url
  }

  console.warn("No URL found for flavor:", flavor, ", time:", time)
  return null
}


// Returns true if state was loaded, false if not
const loadHashState = () => {
  if (window.location.hash != "") {
    let parsed = parseHash(window.location.hash)
    const dispatch = store.dispatch

    dispatch({type: ObserverActions.SITE_SELECTED, payload: parsed.site})
    dispatch({type: ObserverActions.PRODUCT_SELECTED, payload: parsed.product})
    dispatch({type: ObserverActions.FLAVOR_SELECTED, payload: parsed.flavor})
    dispatch({type: ObserverActions.FLAVOR_SELECTED, payload: parsed.flavor})

    let animationRunning = parsed.animationRunning == "true" ? true : false
    if (store.getState().animation.running != animationRunning) {
      dispatch({type: ObserverActions.TOGGLE_ANIMATION})
    }

    if (parsed.lon !== undefined && parsed.lat !== undefined &&
        parsed.lon !== "NaN" && parsed.lat !== "NaN") {
      let lon = parseFloat(parsed.lon)
      let lat = parseFloat(parsed.lat)
      dispatch({type: ObserverActions.MAP_CENTER_CHANGED, payload: {lon: lon, lat: lat}})
    } else {
      dispatch({type: ObserverActions.MAKE_CURRENT_SITE_INTENDED})
    }

    return true
  }

  return false
}


const renderApp = () => {
  console.log("About to render...");
  ReactDOM.render(
      <ObserverApp store={store}
                   productUrlResolver={productUrlResolver} />,
    document.getElementById('observer')
  )
}


const url = "data/catalog.json"
let rendered = false
const fetchCatalog = () => {
  httpGetPromise(url)
    .then(JSON.parse)
    .then((obj) => {
      store.dispatch({type: ObserverActions.CATALOG_UPDATED, payload: obj})

      if (!rendered) {
        if (!loadHashState()) {
          store.dispatch({type: ObserverActions.MAKE_CURRENT_SITE_INTENDED})
        }

        renderApp()
        rendered = true
      }
    })
}

fetchCatalog()
setTimeout(fetchCatalog, 30000)
