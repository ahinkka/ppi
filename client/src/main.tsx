// Force the loading order for jQuery and Bootstrap
import 'jquery'
import 'bootstrap'

import React from 'react'
import { createRoot } from 'react-dom/client'
import {createStore} from 'redux'
import { Provider } from 'react-redux'

import { connect } from 'react-redux'

import CatalogProvider from './catalog'
import GeoInterestsProvider from './components/geointerests_provider'
import ObserverApp from './components/app'
import ProductLoaderComponent from './product_loader'
import UrlStateAdapter from './components/url_state_adapter'
import {ObserverActions} from './constants'
import { State, reducer } from './state'

const debugRedux = false
// const debugRedux = true
const store = !debugRedux ? createStore(reducer) : createStore(
  reducer,
  // @ts-expect-error Redux debugging facilities
  window.__REDUX_DEVTOOLS_EXTENSION__ &&
    // @ts-expect-error Redux debugging facilities
    window.__REDUX_DEVTOOLS_EXTENSION__({ serialize: true, trace: true })
)

store.dispatch({type: ObserverActions.PRIME})


const ReduxConnectedProductLoader = connect(
  (state: State) => ({
    selectedFlavor: state.selection.flavor,
    loadedProducts: state.loadedProducts
  })
)(ProductLoaderComponent)


const productUrlResolver = (flavor, time) => {
  const urlPrefix = 'data/'

  if (flavor === undefined || flavor == null || time == null) {
    console.warn('No URL found for flavor:', flavor, ', time:', time)
    return null
  }

  // TODO: when a new catalog comes in, parse the times
  const tmp = flavor.times.find((x) => Date.parse(x.time) == time)
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
const geoInterestsUrl = 'data/geointerests.geojson'
const renderApp = () => {
  const container = document.getElementById('ppi')
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <CatalogProvider
        onCatalogUpdate={(catalog) => store.dispatch({
          type: ObserverActions.CATALOG_UPDATED,
          payload: catalog
        })}
        url={url}
      />
      <GeoInterestsProvider dispatch={store.dispatch} url={geoInterestsUrl} />
      <Provider store={store}>
        <ReduxConnectedProductLoader
          productUrlResolver={productUrlResolver}
          setProductRepositoryObject={setProductRepositoryObject}
          onProductLoadUpdate={(payload) => store.dispatch({
            type: ObserverActions.PRODUCT_LOAD_UPDATE,
            payload: payload
          })}
        />
        <UrlStateAdapter />
        <ObserverApp productUrlResolver={productUrlResolver} getProductByUrl={getProductByUrl} />
      </Provider>
    </React.StrictMode>
  )
}

renderApp()
