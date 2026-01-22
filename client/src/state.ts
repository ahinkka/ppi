import * as O from 'optics-ts'

import { ObserverActions } from './constants'
import { Catalog, Site, CatalogProduct, Flavor } from './catalog'

export type State = {
  catalog: Catalog,
  selection: {
    siteId: string | null,
    productId: string | null,
    flavorId: string | null,

    site: Site | null,
    product: CatalogProduct | null,
    flavor: Flavor | null
  },
  map: {
    current: { // the map element controls this
      pointerLocation: {
        x: number,
        y: number
      },
      centerLon: number,
      centerLat: number
    },
    intended: { // the app controls this; whenever this changes, map centers on it
      centerLon: number,
      centerLat: number
    },
  },
  animation: {
    currentProductTime: number | null,
    running: boolean,
    stayOnLastTime: boolean
  }
  loadedProducts: { [key: string]: null | undefined },
  geoInterests: unknown
}

const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const pipe = (x, ...fns) => fns.reduce((acc, fn) => fn(acc), x)

// Lenses into state
export const catalogL = O.optic_<State>().prop('catalog')
export const radarProductsL = catalogL.prop('radarProducts')
export const geoInterestsL = O.optic_<State>().prop('geoInterests')

export const selectionL = O.optic_<State>().prop('selection')
export const selectedSiteIdL = selectionL.prop('siteId')
export const selectedProductIdL = selectionL.prop('productId')
export const selectedFlavorIdL = selectionL.prop('flavorId')

export const selectedSiteL = selectionL.prop('site')
export const selectedProductL = selectionL.prop('product')
export const selectedFlavorL = selectionL.prop('flavor')

const animationL = O.optic_<State>().prop('animation')
export const currentProductTimeL = animationL.prop('currentProductTime')
export const animationRunningL = animationL.prop('running')
export const stayOnLastTimeL = animationL.prop('stayOnLastTime')

const mapCurrentL = O.optic_<State>().prop('map').prop('current')
export const currentLonL = mapCurrentL.prop('centerLon')
export const currentLatL = mapCurrentL.prop('centerLat')
const mapIntendedL = O.optic_<State>().prop('map').prop('intended')
export const intendedLonL = mapIntendedL.prop('centerLon')
export const intendedLatL = mapIntendedL.prop('centerLat')

export const currentPointerLocationL = mapCurrentL.prop('pointerLocation')

export const loadedProductsL = O.optic_<State>().prop('loadedProducts')


const selectSite = (previousSiteId, radarProducts) => {
  if (previousSiteId != null) {
    for (const siteId in radarProducts) {
      if (siteId == previousSiteId) {
        return [siteId, radarProducts[siteId]]
      }
    }
  } else {
    const options = Object.keys(radarProducts).sort()
    return options.length > 0 ? [options[0], radarProducts[options[0]]] : [null, null];
  }
}


const selectProduct = (previousProductSelection, site) => {
  if (previousProductSelection != null) {
    for (const productId in site.products) {
      if (productId == previousProductSelection) {
        return [productId, site.products[productId]]
      }
    }
  }

  let options = []
  if (site && site.products) {
    options = Object.keys(site.products)
  }
  options.sort()
  return options.length > 0 ? [options[0], site.products[options[0]]] : [null, null]
}


const selectFlavor = (previousFlavor, product) => {
  if (previousFlavor != null) {   
    for (const flavorId in product.flavors) {
      if (flavorId == previousFlavor) {
        return [flavorId, product.flavors[flavorId]];
      }
    }
  }

  let options = []
  if (product && product.flavors) {
    options = Object.keys(product.flavors)
  }
  options.sort()
  return options.length > 0 ? [options[0], product.flavors[options[0]]] : [null, null];
}


const findFlavorTimeIndex = (flavorTimes, time) => {
  let currentIndex = null

  // We start looking from the end because the mechanism breaks if there are
  // multiple identical times.
  for (let i=flavorTimes.length-1; i>-1; i--) {
    const parsedTime = Date.parse(flavorTimes[i].time)
    if (parsedTime === time) {
      currentIndex = i
      break
    }
  }

  return currentIndex
}


export const selectFlavorTime = (flavor, currentTime, chooseNext, stayOnLastTime) => {
  if (flavor == null) {
    console.warn('selectFlavorTime, flavor is null')
    return null
  } else if (flavor.times.length == 0) {
    console.warn('selectFlavorTime, no flavor times')
    return null
  }

  if (stayOnLastTime) {
    return Date.parse(flavor.times[flavor.times.length - 1].time)
  } else {
    const currentIndex = findFlavorTimeIndex(flavor.times, currentTime)

    // TODO: if no exact match is found, choose the next one chronologically.
    if (currentIndex != null) {
      let resultIndex = chooseNext ? currentIndex + 1 : currentIndex

      if (resultIndex == flavor.times.length) {
        resultIndex = 0
      }

      return Date.parse(flavor.times[resultIndex].time)
    }

    return chooseNext ?
      Date.parse(flavor.times[0].time) :
      Date.parse(flavor.times[flavor.times.length - 1].time)
  }
}


const reduceValidSelection = (state) => {
  const [siteId, site] = selectSite(O.get(selectedSiteIdL)(state), O.get(radarProductsL)(state))
  const withValidSite = compose(
    O.set(selectedSiteIdL)(siteId),
    O.set(selectedSiteL)(site)
  )(state)

  const [productId, product] = selectProduct(
    O.get(selectedProductIdL)(withValidSite),
    O.get(selectedSiteL)(withValidSite)
  )
  const withValidProduct = compose(
    O.set(selectedProductIdL)(productId),
    O.set(selectedProductL)(product)
  )(withValidSite)

  const [flavorId, flavor] = selectFlavor(
    O.get(selectedFlavorIdL)(withValidProduct),
    O.get(selectedProductL)(withValidProduct)
  )

  return compose(
    O.set(selectedFlavorIdL)(flavorId),
    O.set(selectedFlavorL)(flavor),
    reduceStayOnLastTime,
  )(withValidProduct)
}


export const reduceValidAnimationTime = (state) => {
  const currentTime = selectFlavorTime(
    state.selection.flavor,
    O.get(currentProductTimeL)(state),
    false,
    O.get(stayOnLastTimeL)(state)
  )

  return O.set(currentProductTimeL)(currentTime)(state)
}


const reduceIntendedInitialMapCenter = (state) => {
  if ([currentLonL, currentLatL, intendedLonL, intendedLatL]
    .every((lens) => !O.get(lens)(state))) {
    return makeCurrentSiteIntendedReducer(state)
  } else {
    return state
  }
}


export const catalogUpdatedReducer = (state, action) =>
  pipe(
    state,
    O.set(catalogL)(action.payload),
    reduceValidSelection,
    reduceValidAnimationTime,
    reduceIntendedInitialMapCenter
  )


const siteSelectedReducer = (state, action) => {
  let [siteId, site] = [action.payload, O.get(radarProductsL)(state)[action.payload]]
  if (site == undefined) {
    [siteId, site] = selectSite(state.selection.siteId, O.get(radarProductsL)(state))
  }
  const siteChanged = state.selection.siteId != siteId

  const withSiteSet = compose(O.set(selectedSiteIdL)(siteId), O.set(selectedSiteL)(site))(state)

  if (siteChanged) {
    return pipe(
      withSiteSet,
      reduceValidSelection,
      makeCurrentSiteIntendedReducer,
      reduceValidAnimationTime
    )
  } else {
    return pipe(
      withSiteSet,
      reduceValidSelection,
      reduceValidAnimationTime
    )
  }
}


const productSelectedReducer = (state, action) => {
  let [productId, product] = [
    action.payload,
    (O.get(selectedSiteL.prop('products'))(state) ?? {})[action.payload]
  ]

  if (product == undefined) {
    [productId, product] = selectProduct(state.selection.productId, state.selection.site);
  }

  return pipe(
    state,
    O.set(selectedProductIdL)(productId),
    O.set(selectedProductL)(product),
    reduceValidSelection,
    reduceValidAnimationTime
  )
}


const flavorSelectedReducer = (state, action) => {
  let [flavorId, flavor] = [
    action.payload,
    (O.get(selectedProductL.prop('flavors'))(state) ?? {})[action.payload]
  ]

  if (flavor == undefined) {
    [flavorId, flavor] = selectFlavor(state.selection.flavorId, state.selection.product);
  }

  return pipe(
    state,
    O.set(selectedFlavorIdL)(flavorId),
    O.set(selectedFlavorL)(flavor),
    reduceValidAnimationTime,
    reduceValidSelection
  )
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


const pointerLocationReducer = (state, newLocation) =>
  O.set(currentPointerLocationL)(newLocation)(state)


const cycleSiteReducer = (state) => {
  const options = Object.keys(O.get(radarProductsL)(state)).sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.siteId)
  const newIndex = current + 1 == options.length ? 0 : current + 1

  const [newSiteId, newSite] = [options[newIndex], O.get(radarProductsL)(state)[options[newIndex]]]
  const siteChanged = state.selection.siteId != newSiteId

  state = compose(O.set(selectedSiteIdL)(newSiteId), O.set(selectedSiteL)(newSite))(state)

  if (siteChanged) {
    state = makeCurrentSiteIntendedReducer(state)
  }

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const cycleProductReducer = (state) => {
  const options = Object.keys(state.selection.site.products).sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.productId)
  const newIndex = current + 1 == options.length ? 0 : current + 1

  const [newProductId, newProduct] = [options[newIndex], state.selection.site.products[options[newIndex]]]
  state = compose(O.set(selectedProductIdL)(newProductId), O.set(selectedProductL)(newProduct))(state)

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const cycleFlavorReducer = (state) => {
  const options = Object.keys(state.selection.product.flavors).sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.flavorId)
  const newIndex = current + 1 == options.length ? 0 : current + 1

  const [newFlavorId, newFlavor] = [options[newIndex], state.selection.product.flavors[options[newIndex]]]
  state = compose(O.set(selectedFlavorIdL)(newFlavorId), O.set(selectedFlavorL)(newFlavor))(state)

  return reduceValidAnimationTime(state)
}


export const animationTickReducer = (state) =>
  O.set(currentProductTimeL)(
    selectFlavorTime(state.selection.flavor, state.animation.currentProductTime, true, false)
  )(state)


const reduceStayOnLastTime = (state) => {
  const flavorTimes = state.selection.flavor ? state.selection.flavor.times : []
  const intendedIndex = findFlavorTimeIndex(flavorTimes, O.get(currentProductTimeL)(state))

  return O.set(stayOnLastTimeL)(
    !O.get(animationRunningL)(state) && intendedIndex == flavorTimes.length - 1
  )(state)
}


const tickClickedReducer = (state, action) =>
  pipe(
    state,
    O.set(currentProductTimeL)(action.payload),
    reduceStayOnLastTime
  )


const forwardBackwardReducer = (state, forward) => {
  const times = state.selection.flavor.times
  let previousIndex = null;

  if (forward) {
    for (let i=times.length-1; i>-1; i--) {
      const time = Date.parse(times[i].time)
      if (time === state.animation.currentProductTime) {
        previousIndex = i
        break
      }
    }
  } else {
    for (let i=0; i<times.length; i++) {
      const time = Date.parse(times[i].time)
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

  return pipe(
    state,
    O.set(currentProductTimeL)(newTime),
    reduceStayOnLastTime
  )
}
const tickForwardReducer = (state) => forwardBackwardReducer(state, true)
const tickBackwardReducer = (state) => forwardBackwardReducer(state, false)


const toggleAnimationReducer = (state) =>
  pipe(
    state,
    (s) => O.set(animationRunningL)(!O.get(animationRunningL)(s))(s),
    reduceStayOnLastTime
  )


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
      catalog: {
        radarProducts: {}
      },
      geoInterests: {},
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
        running: false,
        stayOnLastTime: true
      }
    } as State
  } else if (action.type === ObserverActions.CATALOG_UPDATED) {
    return catalogUpdatedReducer(state, action);
  } else if (action.type === ObserverActions.GEOINTERESTS_UPDATED) {
    return O.set(geoInterestsL)(action.payload)(state)
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
  } else if (action.type === ObserverActions.POINTER_MOVED) {
    return pointerLocationReducer(state, action.payload)
  } else if (action.type === ObserverActions.POINTER_LEFT_MAP) {
    return pointerLocationReducer(state, null)
  } else if (action.type === ObserverActions.ANIMATION_TICK) {
    return animationTickReducer(state);
  } else if (action.type === ObserverActions.TICK_CLICKED) {
    return tickClickedReducer(state, action);
  } else if (action.type === ObserverActions.TICK_FORWARD) {
    return tickForwardReducer(state);
  } else if (action.type === ObserverActions.TICK_BACKWARD) {
    return tickBackwardReducer(state);
  } else if (action.type === ObserverActions.TOGGLE_ANIMATION) {
    return toggleAnimationReducer(state)
  } else if (action.type === ObserverActions.PRODUCT_LOAD_UPDATE) {
    return productLoadUpdateReducer(state, action);
  }
}
