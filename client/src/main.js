import React from 'react'
import ReactDOM from 'react-dom'
import {createStore} from 'redux'
import { Provider } from 'react-redux'

import CatalogProvider from './components/catalog_provider.js'
import ObserverApp from './components/app'
import ProductLoader from './components/product_loader.js'
import UrlStateAdapter from './components/url_state_adapter.js'
import {ObserverActions} from './constants'
import {reducer} from './state_reduction'

const debugRedux = false
// const debugRedux = true
let store = !debugRedux ? createStore(reducer) : createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ &&
    window.__REDUX_DEVTOOLS_EXTENSION__({ serialize: true, trace: true })
)

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


const [getProductByUrl, setProductRepositoryObject] = (() => {
  let loadedProducts = null
  const getProductByUrl = (url) => {
    // console.log('loadedProducts[url]', loadedProducts, url)
    return loadedProducts[url]
  }
  const setProductRepositoryObject = (obj) => {
    // console.log('loadedProducts = obj', loadedProducts, obj)
    loadedProducts = obj
  }
  return [getProductByUrl, setProductRepositoryObject]
})()


const url = 'data/catalog.json'
const renderApp = () => {
  ReactDOM.render(
    [
      <CatalogProvider key='cp' dispatch={store.dispatch} url={url} />,
      <Provider key='p' store={store}>
        <ProductLoader key='pl' productUrlResolver={productUrlResolver}
          setProductRepositoryObject={setProductRepositoryObject} />
        <UrlStateAdapter key='usa' />
        <ObserverApp key='oa' productUrlResolver={productUrlResolver}
          getProductByUrl={getProductByUrl} />
      </Provider>
    ],
    document.getElementById('ppi')
  )
}

renderApp()
