import React from "react"
import ReactDOM from "react-dom"

import {createStore} from 'redux'

import {ObserverApp} from "./components/app"

import {reducer} from "./state_reduction"
let store = createStore(reducer,
			window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__())


const productUrlResolver = (state, radar, product, flavor, time) => {
  let urlPrefix = 'radar/'

  for (let productKey in state.index.products) {
    // TODO: refactor productKey to not include the radar...
    let product_ = state.index.products[productKey]
    if (product_.radar === radar && productKey === product) {
      for (let flavorKey in product_.flavors) {
	if (flavorKey === flavor) {
	  let flavor = product_.flavors[flavorKey]
	  for (let timeIndex in flavor) {
	    let flavorTime = flavor[timeIndex]
	    let tmp = Date.parse(flavorTime.time)
	    if (tmp === time) {
	      return urlPrefix + flavorTime.url
	    }
	  }
	}
      }
    }
  }

  return null
}


console.log("About to render...");
ReactDOM.render(
  <ObserverApp url="radar/index.json"
               store={store}
               productUrlResolver={productUrlResolver} />,
  document.getElementById('observer')
)
