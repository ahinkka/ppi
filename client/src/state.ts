import { pipe } from 'fp-ts/function'
import * as O from 'optics-ts'

import { Action } from './action'
import { Catalog, CatalogProduct, Flavor, RadarProducts, Site } from './catalog'

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
      pointerLocation: [number, number] | null,
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
  geoInterests: unknown,
  browserGeolocation: {
    enabled: boolean,
    position: [number, number] | null,
    accuracy: number | null,
    error: string | null
  }
}

// Lenses into state
const catalogL = O.optic_<State>().prop('catalog')
const radarProductsL = catalogL.prop('radarProducts')
const geoInterestsL = O.optic_<State>().prop('geoInterests')
const browserGeolocationL = O.optic_<State>().prop('browserGeolocation')
const browserGeolocationEnabledL = browserGeolocationL.prop('enabled')
const browserGeolocationPositionL = browserGeolocationL.prop('position')
const browserGeolocationAccuracyL = browserGeolocationL.prop('accuracy')
const browserGeolocationErrorL = browserGeolocationL.prop('error')

const selectionL = O.optic_<State>().prop('selection')
const selectedSiteIdL = selectionL.prop('siteId')
const selectedProductIdL = selectionL.prop('productId')
const selectedFlavorIdL = selectionL.prop('flavorId')

const selectedSiteL = selectionL.prop('site')
const selectedProductL = selectionL.prop('product')
const selectedFlavorL = selectionL.prop('flavor')

const animationL = O.optic_<State>().prop('animation')
const currentProductTimeL = animationL.prop('currentProductTime')
const animationRunningL = animationL.prop('running')
const stayOnLastTimeL = animationL.prop('stayOnLastTime')

const mapCurrentL = O.optic_<State>().prop('map').prop('current')
const currentLonL = mapCurrentL.prop('centerLon')
const currentLatL = mapCurrentL.prop('centerLat')
const mapIntendedL = O.optic_<State>().prop('map').prop('intended')
const intendedLonL = mapIntendedL.prop('centerLon')
const intendedLatL = mapIntendedL.prop('centerLat')

const currentPointerLocationL = mapCurrentL.prop('pointerLocation')


function selectSite(
  previousSiteId: string,
  radarProducts: RadarProducts
): [string, Site] | [null, null] {
  if (previousSiteId != null) {
    for (const siteId in radarProducts) {
      if (siteId === previousSiteId) {
        return [siteId, radarProducts[siteId]]
      }
    }
  }

  const options = Object.keys(radarProducts).sort()
  return options.length > 0
    ? [options[0], radarProducts[options[0]]]
    : [null, null]
}


function selectProduct(previousProductSelection: string, site: State['selection']['site']): [string, CatalogProduct] {
  if (previousProductSelection != null) {
    for (const productId in site.products) {
      if (productId === previousProductSelection) {
        return [productId, site.products[productId]]
      }
    }
  }

  const options: string[] = site && site.products
    ? Object.keys(site.products).sort()
    : []

  return options.length > 0
    ? [options[0], site.products[options[0]]]
    : [null, null]
}


function selectFlavor(previousFlavor: string, product: CatalogProduct): [string, Flavor] {
  if (previousFlavor != null) {   
    for (const flavorId in product.flavors) {
      if (flavorId === previousFlavor) {
        return [flavorId, product.flavors[flavorId]]
      }
    }
  }

  const options: string[] = product && product.flavors
    ? Object.keys(product.flavors).sort()
    : []

  return options.length > 0
    ? [options[0], product.flavors[options[0]]]
    : [null, null]
}


const findFlavorTimeIndex = (flavorTimes: Flavor['times'], time: number) => {
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


export const selectFlavorTime = (
  flavor: Flavor,
  currentTime: number,
  chooseNext: boolean,
  stayOnLastTime: boolean
) => {
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


const reduceValidSelection = (state: State) => {
  const [siteId, site] = selectSite(O.get(selectedSiteIdL)(state), O.get(radarProductsL)(state))
  const withValidSite = pipe(
    state,
    O.set(selectedSiteL)(site),
    O.set(selectedSiteIdL)(siteId)
  )

  const [productId, product] = selectProduct(
    O.get(selectedProductIdL)(withValidSite),
    O.get(selectedSiteL)(withValidSite)
  )
  const withValidProduct = pipe(
    withValidSite,
    O.set(selectedProductL)(product),
    O.set(selectedProductIdL)(productId)
  )

  const [flavorId, flavor] = selectFlavor(
    O.get(selectedFlavorIdL)(withValidProduct),
    O.get(selectedProductL)(withValidProduct)
  )

  return pipe(
    withValidProduct,
    reduceStayOnLastTime,
    O.set(selectedFlavorL)(flavor),
    O.set(selectedFlavorIdL)(flavorId)
  )
}


export const reduceValidAnimationTime = (state: State) => {
  const currentTime = selectFlavorTime(
    state.selection.flavor,
    O.get(currentProductTimeL)(state),
    false,
    O.get(stayOnLastTimeL)(state)
  )

  return O.set(currentProductTimeL)(currentTime)(state)
}


const reduceIntendedInitialMapCenter = (state: State) => {
  if ([currentLonL, currentLatL, intendedLonL, intendedLatL]
    .every((lens) => !O.get(lens)(state))) {
    return makeCurrentSiteIntendedReducer(state)
  } else {
    return state
  }
}


export const catalogUpdatedReducer = (state: State, action: Extract<Action, { type: 'catalog updated' }>) =>
  pipe(
    state,
    O.set(catalogL)(action.payload),
    reduceValidSelection,
    reduceValidAnimationTime,
    reduceIntendedInitialMapCenter
  )


const siteSelectedReducer = (state: State, action: Extract<Action, { type: 'site selected' }>) => {
  const siteIdFromPayload = action.payload
  let [siteId, site]: [string | null, Site | null] = [
    siteIdFromPayload,
    O.get(radarProductsL)(state)[siteIdFromPayload]
  ]
  if (site == undefined) {
    [siteId, site] = selectSite(state.selection.siteId, O.get(radarProductsL)(state))
  }
  const siteChanged = state.selection.siteId != siteId

  const withSiteSet = pipe(state, O.set(selectedSiteL)(site), O.set(selectedSiteIdL)(siteId))

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


const productSelectedReducer = (state: State, action: Extract<Action, { type: 'product selected' }>) => {
  let [productId, product]: [string, CatalogProduct] = [
    action.payload,
    (O.get(selectedSiteL.prop('products'))(state) ?? {})[action.payload]
  ]

  if (product == undefined) {
    [productId, product] = selectProduct(state.selection.productId, state.selection.site)
  }

  return pipe(
    state,
    O.set(selectedProductIdL)(productId),
    O.set(selectedProductL)(product),
    reduceValidSelection,
    reduceValidAnimationTime
  )
}


const flavorSelectedReducer = (state: State, action: Extract<Action, { type: 'flavor selected' }>) => {
  let [flavorId, flavor]: [string, Flavor] = [
    action.payload,
    (O.get(selectedProductL.prop('flavors'))(state) ?? {})[action.payload]
  ]

  if (flavor == undefined) {
    [flavorId, flavor] = selectFlavor(state.selection.flavorId, state.selection.product)
  }

  return pipe(
    state,
    O.set(selectedFlavorIdL)(flavorId),
    O.set(selectedFlavorL)(flavor),
    reduceValidAnimationTime,
    reduceValidSelection
  )
}


const mapCenterChangedReducer = (state: State, action: Extract<Action, { type: 'map center changed' }>) => {
  const { lon: centerLon, lat: centerLat } = action.payload
  return {
    ...state,
    map: {
      ...state.map,
      intended: { centerLon, centerLat }
    }
  } as State
}


const mapMovedReducer = (state: State, action: Extract<Action, { type: 'map moved' }>) => {
  const { lon: centerLon, lat: centerLat } = action.payload
  return {
    ...state,
    map: {
      ...state.map,
      current: { centerLon, centerLat }
    }
  } as State
}


function makeCurrentSiteIntendedReducer(state: State): State {
  return {
    ...state,
    map: {
      ...state.map,
      intended: {
        ...state.map.current,
        centerLon: state.selection.site.lon,
        centerLat: state.selection.site.lat,
      }
    }
  }
}


const pointerLocationReducer = (state: State, newLocation: [number, number] | null) =>
  pipe(
    state,
    O.set(currentPointerLocationL)(newLocation)
  )


function cycleSiteReducer(state: State): State {
  const options = Object.keys(O.get(radarProductsL)(state)).sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.siteId)
  const newIndex = current + 1 == options.length ? 0 : current + 1

  const newSiteId = options[newIndex]
  const newSite = O.get(radarProductsL)(state)[options[newIndex]]
  const siteChanged = state.selection.siteId != newSiteId

  return pipe(
    state,
    O.set(selectedSiteL)(newSite),
    O.set(selectedSiteIdL)(newSiteId),
    siteChanged ? makeCurrentSiteIntendedReducer : (s) => s,
    reduceValidSelection,
    reduceValidAnimationTime
  )
}


function cycleProductReducer(state: State): State {
  const options = Object.keys(state.selection.site.products).sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.productId)
  const newIndex = current + 1 == options.length ? 0 : current + 1

  const newProductId = options[newIndex]
  const newProduct = state.selection.site.products[options[newIndex]]


  return pipe(
    state,
    O.set(selectedProductL)(newProduct),
    O.set(selectedProductIdL)(newProductId),
    reduceValidSelection,
    reduceValidAnimationTime
  )
}


function cycleFlavorReducer(state: State): State {
  const options = Object.keys(state.selection.product.flavors).sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.flavorId)
  const newIndex = current + 1 == options.length ? 0 : current + 1

  const newFlavorId = options[newIndex]
  const newFlavor = state.selection.product.flavors[options[newIndex]]

  return pipe(
    state,
    O.set(selectedFlavorL)(newFlavor),
    O.set(selectedFlavorIdL)(newFlavorId),
    reduceValidAnimationTime
  )
}


export const animationTickReducer = (state: State): State =>
  O.set(currentProductTimeL)(
    selectFlavorTime(state.selection.flavor, state.animation.currentProductTime, true, false)
  )(state)


function reduceStayOnLastTime(state: State): State {
  const flavorTimes = state.selection.flavor ? state.selection.flavor.times : []
  const intendedIndex = findFlavorTimeIndex(flavorTimes, O.get(currentProductTimeL)(state))

  return O.set(stayOnLastTimeL)(
    !O.get(animationRunningL)(state) && intendedIndex == flavorTimes.length - 1
  )(state)
}


const tickClickedReducer = (state: State, action: Extract<Action, { type: 'tick clicked' }>): State =>
  pipe(
    state,
    O.set(currentProductTimeL)(action.payload),
    reduceStayOnLastTime
  )


function forwardBackwardReducer(state: State, forward: boolean): State {
  const times = state.selection.flavor.times
  let previousIndex = null

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
const tickForwardReducer = (state: State) => forwardBackwardReducer(state, true)
const tickBackwardReducer = (state: State) => forwardBackwardReducer(state, false)


const toggleAnimationReducer = (state: State): State =>
  pipe(
    state,
    (s: State) => O.set(animationRunningL)(!O.get(animationRunningL)(s))(s),
    reduceStayOnLastTime
  )


function productLoadUpdateReducer(state: State, action: Extract<Action, { type: 'product load update' }>): State {
  // TODO: implement properly to handle removes
  const loadedProducts = { ...state.loadedProducts }

  for (const url of action.payload.loaded) {
    loadedProducts[url] = null
  }

  for (const url of action.payload.unloaded) {
    delete loadedProducts[url]
  }

  return { ...state, loadedProducts }
}


function toggleBrowserGeolocationEnabled(state: State, payload?: boolean) {
  // This needs a payload because React renders components twice in dev mode,
  // resulting in the state being loaded twice from the hash. This ensures the
  // state is always loaded correctly even if it's loaded twice.
  const newValue = payload !== undefined
    ? payload
    : !O.get(browserGeolocationEnabledL)(state)

  return O.set(browserGeolocationEnabledL)(newValue)(state)
}


const initialState: State = {
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
  loadedProducts: {},
  map: {
    current: {
      centerLon: 0,
      centerLat: 0,
      pointerLocation: null
    },
    intended: {
      centerLon: 0,
      centerLat: 0,
    }
  },
  animation: {
    currentProductTime: null,
    running: false,
    stayOnLastTime: true
  },
  browserGeolocation: {
    enabled: false,
    position: null,
    accuracy: null,
    error: null
  }
}

// Redux store types
export type RootState = State
export type AppDispatch = (action: Action) => Action

export function reducer(state: State | undefined, action: Action): State {
  if (state === undefined) {
    state = initialState
  }

  switch (action.type) {
    case 'prime':
      return initialState
    case 'catalog updated':
      return catalogUpdatedReducer(state, action as Extract<Action, { type: 'catalog updated' }>)
    case 'geointerests updated':
      return O.set(geoInterestsL)(action.payload)(state)
    case 'site selected':
      return siteSelectedReducer(state, action as Extract<Action, { type: 'site selected' }>)
    case 'cycle site':
      return cycleSiteReducer(state)
    case 'cycle product':
      return cycleProductReducer(state)
    case 'cycle flavor':
      return cycleFlavorReducer(state)
    case 'product selected':
      return productSelectedReducer(state, action as Extract<Action, { type: 'product selected' }>)
    case 'flavor selected':
      return flavorSelectedReducer(state, action as Extract<Action, { type: 'flavor selected' }>)
    case 'map center changed':
      return mapCenterChangedReducer(state, action as Extract<Action, { type: 'map center changed' }>)
    case 'map moved':
      return mapMovedReducer(state, action as Extract<Action, { type: 'map moved' }>)
    case 'make current site intended':
      return makeCurrentSiteIntendedReducer(state)
    case 'pointer moved':
      return pointerLocationReducer(state, action.payload)
    case 'pointer left map':
      return pointerLocationReducer(state, null)
    case 'animation tick':
      return animationTickReducer(state)
    case 'tick clicked':
      return tickClickedReducer(state, action as Extract<Action, { type: 'tick clicked' }>)
    case 'tick forward':
      return tickForwardReducer(state)
    case 'tick backward':
      return tickBackwardReducer(state)
    case 'toggle animation':
      return toggleAnimationReducer(state)
    case 'product load update':
      return productLoadUpdateReducer(state, action as Extract<Action, { type: 'product load update' }>)
    case 'toggle browser geolocation':
      return toggleBrowserGeolocationEnabled(state, action.payload)
    case 'browser geolocation position updated':
      return pipe(
        state,
        O.set(browserGeolocationPositionL)(action.payload.position),
        O.set(browserGeolocationAccuracyL)(action.payload.accuracy),
        O.set(browserGeolocationErrorL)(null)
      )
    case 'browser geolocation error':
      return pipe(
        state,
        O.set(browserGeolocationErrorL)(action.payload),
        O.set(browserGeolocationPositionL)(null),
        O.set(browserGeolocationAccuracyL)(null)
      )
  }
}
