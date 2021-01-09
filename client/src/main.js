import React from 'react'
import ReactDOM from 'react-dom'
import {createStore} from 'redux'
import { Provider } from 'react-redux'

import UrlStateAdapter from './components/url_state_adapter.js'
import CatalogProvider from './components/catalog_provider.js'
import {ObserverApp} from './components/app'
import {ObserverActions} from './constants'
import {parseHash} from './state_hash'
import {reducer} from './state_reduction'

const debugRedux = false
let store = !debugRedux ? createStore(reducer) : createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ &&
    window.__REDUX_DEVTOOLS_EXTENSION__()
)
// { serialize: true, trace: true }

store.dispatch({type: ObserverActions.PRIME})


const productUrlResolver = (flavor, time) => {
  let urlPrefix = 'data/'

  if (flavor === undefined || flavor == null || time == null) {
    console.warn('No URL found for flavor:', flavor, ', time:', time)
    return null
  }

  // TODO: when a new catalog comes in, parse the times
  let tmp = flavor.times.find((x) => Date.parse(x.time) == time)
  if (tmp !== undefined) {
    return urlPrefix + tmp.url
  }

  console.warn('No URL found for flavor:', flavor, ', time:', time)
  return null
}


const url = 'data/catalog.json'
const renderApp = () =>
  ReactDOM.render(
    [
     <Provider key='p' store={store}>
       <UrlStateAdapter key='usa' />
     </Provider>,
	<CatalogProvider key='cp' dispatch={store.dispatch} url={url} />,
     <ObserverApp key='oa' store={store} productUrlResolver={productUrlResolver} />
    ],
    document.getElementById('observer')
  )

renderApp()
