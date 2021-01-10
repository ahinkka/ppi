import pako from 'pako';
import * as L from 'partial.lenses'

import { Component } from 'react'
import { connect } from 'react-redux'

import { httpGetPromise, twoDtoUint8Array, lensesToProps } from '../utils'

import {
  selectedFlavorL,
  loadedProductsL
} from '../state_reduction'
import { ObserverActions } from '../constants'

import { orderForLoading } from '../product_time_loading_order'


function inflate(stream) {
  try {
    return pako.inflate(stream, { to: 'string' })
  } catch (err) {
    console.error('Error while decompressing product file:', err);
  }
}


const parseProduct = async (resp) => new Promise((resolve, reject) => {
  let inflated = null
  try {
    inflated = inflate(resp)
    const parsed = JSON.parse(inflated)
    const [cols, rows, buffer] = twoDtoUint8Array(parsed.data)
    parsed._cols = cols
    parsed._rows = rows
    parsed.data = buffer
    resolve(parsed)
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error('Error parsing: ' + e + ' with input ' +
                    inflated.substring(0, 20) +
                    ' ... ' +
                    inflated.substring(inflated.length - 20, inflated.length - 1))
    } else {
      console.warn('Unhandled exception during product load', e)
    }

    reject(e)
  }
})


const loadOneProduct = (dispatch, productUrlResolver, loadedProducts, loadingProducts, flavor) => {
  const removedUrls = new Set()
  const loadingOrderedTimes = orderForLoading(flavor.times.map((t) => Date.parse(t.time)))
  const intendedUrls = loadingOrderedTimes.map((t) => productUrlResolver(flavor, t))

  const currentlyLoaded = new Set(Object.keys(loadedProducts))
  for (const url of currentlyLoaded) {
    if (!intendedUrls.includes(url)) {
      delete loadedProducts[url];
      removedUrls.add(url)
    }
  }

  let urlToLoad = null
  // Then start loading actual products
  for (const url of intendedUrls) {
    if ((url in loadedProducts) || (url in loadingProducts)) {
      continue
    }

    urlToLoad = url
    break
  }

  if (!urlToLoad) {
    return
  }

  loadingProducts[urlToLoad] = new Date()

  httpGetPromise(urlToLoad, true)
    .then(parseProduct)
    .then((parsed) => {
      loadedProducts[urlToLoad] = parsed // eslint-disable-line require-atomic-updates
      dispatch({
        type: ObserverActions.PRODUCT_LOAD_UPDATE,
        payload: {
          loaded: [urlToLoad],
          unloaded: Array.from(removedUrls)
        }
      })
    })
    .catch((e) => {
      console.error('Failed to load product', e)
    })
    .finally(() => {
      delete loadingProducts[urlToLoad]
    })
}


class ProductLoader extends Component {
  constructor() {
    super()
    this.loadedProducts = {}
    this.loadingProducts = {}
  }

  componentDidMount() {
    this.props.setProductRepositoryObject(this.loadedProducts)
  }

  render() {
    const props = this.props
    const flavor =  L.get(selectedFlavorL, props)

    if (!flavor) {
      return null
    }

    const l = () =>
      loadOneProduct(
        props.dispatch,
        props.productUrlResolver,
        this.loadedProducts, this.loadingProducts,
        L.get(selectedFlavorL, props)
      )
    setTimeout(l, 0)

    return null
  }
}


const mapStateToProps = lensesToProps([selectedFlavorL, loadedProductsL])
export default connect(mapStateToProps)(ProductLoader)
