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


const loadHashState = () => {
  if (window.location.hash != "") {
    let parsed = parseHash(window.location.hash)
    const dispatch = state.store.dispatch

    dispatch({type: ObserverActions.SITE_SELECTED, payload: parsed.site})
    dispatch({type: ObserverActions.PRODUCT_SELECTED, payload: parsed.product})
    dispatch({type: ObserverActions.FLAVOR_SELECTED, payload: parsed.flavor})
    dispatch({type: ObserverActions.FLAVOR_SELECTED, payload: parsed.flavor})

    let animationRunning = parsed.animationRunning == "true" ? true : false
    if (state.store.animation.running != animationRunning) {
      dispatch({type: ObserverActions.TOGGLE_ANIMATION})
    }
  }
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
	loadHashState()
	renderApp()
	rendered = true
      }
    })
}

setTimeout(fetchCatalog, 10000)
