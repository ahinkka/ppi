import pako from 'pako';

import {httpGetPromise, twoDtoUint8Array} from './utils'
import {orderForLoading} from './product_time_loading_order'

import {ObserverActions} from './constants'


function inflate(stream) {
  try {
    return pako.inflate(stream, { to: 'string' })
  } catch (err) {
    console.error('Error while decompressing product file:', err);
  }
}


export async function loadProducts(dispatch, productUrlResolver, loadedProducts, loadingProducts, flavor) {
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

  // Then start loading actual products
  for (const url of intendedUrls) {
    if ((url in loadedProducts) || (url in loadingProducts)) {
      continue
    }

    loadingProducts[url] = new Date()
    const resp = await httpGetPromise(url, true).catch((reason) => {
      // TODO: properly handle
      console.warn('Couldn\'t load product ', reason)
    })

    let inflated = null
    let parsed = null
    try {
      inflated = inflate(resp)
      parsed = JSON.parse(inflated)
      const [cols, rows, buffer] = twoDtoUint8Array(parsed.data)
      parsed._cols = cols
      parsed._rows = rows
      parsed.data = buffer
    } catch (e) {
      delete loadingProducts[url];
      if (e instanceof SyntaxError) {
        // TODO: properly handle
        console.error('Error parsing ' + url + ': ' + e + ' with input ' +
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
    delete loadingProducts[url]
    loadedProducts[url] = parsed // eslint-disable-line require-atomic-updates
    dispatch({
      type: ObserverActions.PRODUCT_LOAD_UPDATE,
      payload: {
        loaded: [url],
        unloaded: Array.from(removedUrls)
      }
    })
    break
  }

  for (const url of intendedUrls) {
    if (!(url in loadedProducts)) {
      return true
    }
  }

  return false
}
