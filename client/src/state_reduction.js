// -*- indent-tabs-mode: nil; -*-
import * as L from 'partial.lenses'
import * as R from 'ramda'
import {ObserverActions} from './constants'

// Lenses into state
export const catalogL = L.prop('catalog')
export const selectionL = L.prop('selection')

export const selectedSiteIdL = L.compose(selectionL, 'siteId')
export const selectedProductIdL = L.compose(selectionL, 'productId')
export const selectedFlavorIdL = L.compose(selectionL, 'flavorId')

export const selectedSiteL = L.compose(selectionL, 'site')
export const selectedProductL = L.compose(selectionL, 'product')
export const selectedFlavorL = L.compose(selectionL, 'flavor')

const animationL = L.prop('animation')
export const currentProductTimeL = L.compose(animationL, 'currentProductTime')
export const animationRunningL = L.compose(animationL, 'running')

const mapCurrentL = L.compose(L.prop('map'), 'current')
export const currentLonL = L.compose(mapCurrentL, 'centerLon')
export const currentLatL = L.compose(mapCurrentL, 'centerLat')
const mapIntendedL = L.compose(L.prop('map'), 'intended')
export const intendedLonL = L.compose(mapIntendedL, 'centerLon')
export const intendedLatL = L.compose(mapIntendedL, 'centerLat')

export const loadedProductsL = L.prop('loadedProducts')


const selectSite = (previousSiteId, catalog) => {
  if (previousSiteId != null) {
    for (const siteId in catalog) {
      if (siteId == previousSiteId) {
        return [siteId, catalog[siteId]]
      }
    }
  } else {
    let options = Object.keys(catalog)
    options.sort()
    return options.length > 0 ? [options[0], catalog[options[0]]] : [null, null];
  }
}


const selectProduct = (previousProductSelection, site) => {
  if (previousProductSelection != null) {
    for (const productId in site.products) {
      if (productId == previousProductSelection) {
        return [productId, site.products[productId]]
      }
    }
  } else {
    let options = Object.keys(site.products)
    options.sort()
    return options.length > 0 ? [options[0], site.products[options[0]]] : [null, null];
  }
}


const selectFlavor = (previousFlavor, product) => {
  if (previousFlavor != null) {   
    for (const flavorId in product.flavors) {
      if (flavorId == previousFlavor) {
        return [flavorId, product.flavors[flavorId]];
      }
    }
  }

  let options = Object.keys(product.flavors)
  options.sort()
  return options.length > 0 ? [options[0], product.flavors[options[0]]] : [null, null];
}


const findFlavorTimeIndex = (flavorTimes, time) => {
  let currentIndex = null

  // We start looking from the end because the mechanism breaks if there are
  // multiple identical times.
  for (let i=flavorTimes.length-1; i>-1; i--) {
    let parsedTime = Date.parse(flavorTimes[i].time)
    if (parsedTime === time) {
      currentIndex = i
      break
    }
  }

  return currentIndex
}


export const selectFlavorTime = (flavor, currentTime, chooseNext, isCatalogUpdateAndPreviousTimeWasLast) => {
  if (flavor == null) {
    console.warn('selectFlavorTime, flavor is null')
    return null
  } else if (flavor.times.length == 0) {
    console.warn('selectFlavorTime, no flavor times')
    return null
  }

  const currentIndex = findFlavorTimeIndex(flavor.times, currentTime)

  // TODO: if no exact match is found, choose the next one chronologically.
  if (currentIndex != null) {
    let resultIndex = chooseNext ? currentIndex + 1 : currentIndex

    // Paused, currently on second last - this was triggered by catalog
    // update, and we should stay on last. Probably buggy when changing
    // products and we happen to be on second last product, but it's a less of
    // a critical bug right now.
    if (isCatalogUpdateAndPreviousTimeWasLast && currentIndex == flavor.times.length - 2) {
      resultIndex = flavor.times.length - 1
    } else if (resultIndex == flavor.times.length) {
      resultIndex = 0
    }

    return Date.parse(flavor.times[resultIndex].time)
  }

  return chooseNext ?
    Date.parse(flavor.times[0].time) :
    Date.parse(flavor.times[flavor.times.length - 1].time)
}


const reduceValidSelection = (state) => {
  const [siteId, site] = selectSite(L.get(selectedSiteIdL, state), L.get(catalogL, state))
  const withValidSite = R.compose(L.set(selectedSiteIdL, siteId), L.set(selectedSiteL, site))(state)

  const [productId, product] = selectProduct(L.get(selectedProductIdL, withValidSite), L.get(selectedSiteL, withValidSite))
  const withValidProduct = R.compose(L.set(selectedProductIdL, productId), L.set(selectedProductL, product))(withValidSite)

  const [flavorId, flavor] = selectFlavor(L.get(selectedFlavorIdL, withValidProduct), L.get(selectedProductL, withValidProduct))
  return R.compose(L.set(selectedFlavorIdL, flavorId), L.set(selectedFlavorL, flavor))(withValidProduct)
}


export const reduceValidAnimationTime = (state, isCatalogUpdateAndPreviousTimeWasLast) => {
  const currentTime = selectFlavorTime(state.selection.flavor, L.get(currentProductTimeL, state), false, isCatalogUpdateAndPreviousTimeWasLast)
  return L.set(currentProductTimeL, currentTime)(state)
}


const reduceIntendedInitialMapCenter = (state) => {
  if (R.all((lens) => !L.get(lens, state),
    [currentLonL, currentLatL, intendedLonL, intendedLatL])) {
    return makeCurrentSiteIntendedReducer(state)
  } else {
    return state
  }
}


export const catalogUpdatedReducer = (state, action) => {
  const flavorTimes = state.selection.flavor ? state.selection.flavor.times : []
  const previousTimeIndex = findFlavorTimeIndex(
    flavorTimes,
    L.get(currentProductTimeL, state)
  )
  const isCatalogUpdateAndPreviousTimeWasLast = previousTimeIndex == flavorTimes.length - 1

  return R.pipe(
    L.set(catalogL, action.payload),
    reduceValidSelection,
    (s) => reduceValidAnimationTime(s, isCatalogUpdateAndPreviousTimeWasLast),
    reduceIntendedInitialMapCenter)(state)
}


const siteSelectedReducer = (state, action) => {
  let [siteId, site] = [action.payload, state.catalog[action.payload]]
  if (site == undefined) {
    [siteId, site] = selectSite(state.selection.siteId, state.catalog)
  }
  let siteChanged = state.selection.siteId != siteId

  const withSiteSet = R.compose(L.set(selectedSiteIdL, siteId), L.set(selectedSiteL, site))(state)

  if (siteChanged) {
    return R.pipe(reduceValidSelection, makeCurrentSiteIntendedReducer, reduceValidAnimationTime)(withSiteSet)
  } else {
    return R.pipe(reduceValidSelection, reduceValidAnimationTime)(withSiteSet)
  }
}


const productSelectedReducer = (state, action) => {
  let [productId, product] = [action.payload, state.selection.site.products[action.payload]]
  if (product == undefined) {
    [productId, product] = selectProduct(state.selection.productId, state.selection.site);
  }

  return R.pipe(L.set(selectedProductIdL, productId), L.set(selectedProductL, product),
    reduceValidSelection,
    reduceValidAnimationTime)(state)
}


const flavorSelectedReducer = (state, action) => {
  let [flavorId, flavor] = [action.payload, state.selection.product.flavors[action.payload]]
  if (flavor == undefined) {
    [flavorId, flavor] = selectFlavor(state.selection.flavorId, state.selection.product);
  }

  return R.pipe(L.set(selectedFlavorIdL, flavorId), L.set(selectedFlavorL, flavor),
    reduceValidAnimationTime,
    reduceValidSelection)(state)
}


const mapCenterChangedReducer = (state, action) => {
  state = Object.assign({}, state)
  state.map = Object.assign({}, state.map)
  state.map.intended = Object.assign({}, state.map.intended,
    {
      centerLon: action.payload.lon,
      centerLat: action.payload.lat,
    })
  return state
}


const mapMovedReducer = (state, action) => {
  state = Object.assign({}, state)
  state.map = Object.assign({}, state.map)
  state.map.current = Object.assign({}, state.map.current,
    {
      centerLon: action.payload.lon,
      centerLat: action.payload.lat,
    })
  return state
}


const makeCurrentSiteIntendedReducer = (state) => {
  state = Object.assign({}, state)
  state.map = Object.assign({}, state.map)
  state.map.intended = Object.assign({}, state.map.current,
    {
      centerLon: state.selection.site.lon,
      centerLat: state.selection.site.lat,
    })
  return state
}


const cycleSiteReducer = (state) => {
  let options = Object.keys(state.catalog)
  options.sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.siteId)
  let newIndex = current + 1 == options.length ? 0 : current + 1

  let [newSiteId, newSite] = [options[newIndex], state.catalog[options[newIndex]]]
  let siteChanged = state.selection.siteId != newSiteId

  state = R.compose(L.set(selectedSiteIdL, newSiteId), L.set(selectedSiteL, newSite))(state)

  if (siteChanged) {
    state = makeCurrentSiteIntendedReducer(state)
  }

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const cycleProductReducer = (state) => {
  let options = Object.keys(state.selection.site.products)
  options.sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.productId)
  let newIndex = current + 1 == options.length ? 0 : current + 1

  let [newProductId, newProduct] = [options[newIndex], state.selection.site.products[options[newIndex]]]
  state = R.compose(L.set(selectedProductIdL, newProductId), L.set(selectedProductL, newProduct))(state)

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const cycleFlavorReducer = (state) => {
  let options = Object.keys(state.selection.product.flavors)
  options.sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.flavorId)
  let newIndex = current + 1 == options.length ? 0 : current + 1

  let [newFlavorId, newFlavor] = [options[newIndex], state.selection.product.flavors[options[newIndex]]]
  state = R.compose(L.set(selectedFlavorIdL, newFlavorId), L.set(selectedFlavorL, newFlavor))(state)

  return reduceValidAnimationTime(state)
}


export const animationTickReducer = (state) =>
  L.set(currentProductTimeL,
    selectFlavorTime(state.selection.flavor, state.animation.currentProductTime, true),
    state)


const tickClickedReducer = (state, action) => L.set(currentProductTimeL, action.payload, state)


const forwardBackwardReducer = (state, forward) => {
  let times = state.selection.flavor.times
  let previousIndex = null;

  if (forward) {
    for (let i=times.length-1; i>-1; i--) {
      let time = Date.parse(times[i].time)
      if (time === state.animation.currentProductTime) {
        previousIndex = i
        break
      }
    }
  } else {
    for (let i=0; i<times.length; i++) {
      let time = Date.parse(times[i].time)
      if (time === state.animation.currentProductTime) {
        previousIndex = i
        break
      }
    }
  }

  let newTime = null
  let nextIndex = forward ? previousIndex + 1 : previousIndex - 1
  if (nextIndex == times.length) {
    nextIndex = 0
  } else if (nextIndex < 0) {
    nextIndex = times.length - 1
  }
  newTime = Date.parse(times[nextIndex].time)

  return L.set(currentProductTimeL, newTime, state)
}
const tickForwardReducer = (state) => forwardBackwardReducer(state, true)
const tickBackwardReducer = (state) => forwardBackwardReducer(state, false)


const productTimeReducer = (state, action) => L.set(currentProductTimeL, action.payload, state)


const toggleAnimationReducer = (state) => L.set(animationRunningL, !L.get(animationRunningL, state), state)


const productLoadUpdateReducer = (state, action) => {
  // TODO: implement properly to handle removes
  state = Object.assign({}, state)
  state.loadedProducts = Object.assign({}, state.loadedProducts)

  for (const url of action.payload.loaded) {
    state.loadedProducts[url] = null
  }

  for (const url of action.payload.unloaded) {
    delete state.loadedProducts[url]
  }

  return state
}


export const reducer = (state, action) => {
  if (state === undefined || action.type === ObserverActions.PRIME) {
    return {
      selection: {
        siteId: null,
        site: null,
        productId: null,
        product: null,
        flavorId: null,
        flavor: null
      },
      catalog: {},
      loadedProducts: {}, // urls as keys, null values
      map: {
        current: { // the map element controls this
          centerLon: 0,
          centerLat: 0,
        },
        intended: { // the app controls this; whenever this changes, map centers on it
          centerLon: 0,
          centerLat: 0,
        },
      },
      animation: {
        currentProductTime: null, // the product time we are currently showing
        running: false
      }
    }
  } else if (action.type === ObserverActions.CATALOG_UPDATED) {
    return catalogUpdatedReducer(state, action);
  } else if (action.type === ObserverActions.SITE_SELECTED) {
    return siteSelectedReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_SITE) {
    return cycleSiteReducer(state);
  } else if (action.type === ObserverActions.CYCLE_PRODUCT) {
    return cycleProductReducer(state);
  } else if (action.type === ObserverActions.CYCLE_FLAVOR) {
    return cycleFlavorReducer(state);
  } else if (action.type === ObserverActions.PRODUCT_SELECTED) {
    return productSelectedReducer(state, action);
  } else if (action.type === ObserverActions.FLAVOR_SELECTED) {
    return flavorSelectedReducer(state, action);
  } else if (action.type === ObserverActions.MAP_CENTER_CHANGED) {
    return mapCenterChangedReducer(state, action)
  } else if (action.type === ObserverActions.MAP_MOVED) {
    return mapMovedReducer(state, action)
  } else if (action.type === ObserverActions.MAKE_CURRENT_SITE_INTENDED) {
    return makeCurrentSiteIntendedReducer(state)
  } else if (action.type === ObserverActions.ANIMATION_TICK) {
    return animationTickReducer(state);
  } else if (action.type === ObserverActions.TICK_CLICKED) {
    return tickClickedReducer(state, action);
  } else if (action.type === ObserverActions.TICK_FORWARD) {
    return tickForwardReducer(state);
  } else if (action.type === ObserverActions.TICK_BACKWARD) {
    return tickBackwardReducer(state);
  } else if (action.type === ObserverActions.PRODUCT_TIME_CHANGED) {
    return productTimeReducer(state, action);
  } else if (action.type === ObserverActions.TOGGLE_ANIMATION) {
    return toggleAnimationReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_LOAD_UPDATE) {
    return productLoadUpdateReducer(state, action);
  }
}
