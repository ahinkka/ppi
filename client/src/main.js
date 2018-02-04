import React from "react"
import ReactDOM from "react-dom"
import {createStore} from 'redux'

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


// TODO: implement hash state loading after catalog loading is not in app; we need catalog to set site etc
// if (window.location.hash != "") {
//   let parsed = parseHash(window.location.hash)
  
//   let animationRunning = parsed.animationRunning == "true" ? true : false
// }


console.log("About to render...");
ReactDOM.render(
  <ObserverApp url="data/catalog.json"
               store={store}
               productUrlResolver={productUrlResolver} />,
  document.getElementById('observer')
)
