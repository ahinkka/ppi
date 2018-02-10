import {ObserverActions} from "./constants"


const selectSite = (previousSiteSelection, catalog) => {
  if (previousSiteSelection != null) {
    for (const siteId in catalog) {
      if (siteId == previousSiteSelection) {
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


const selectFlavorTime = (flavor, previousTime) => {
  if (flavor == null) {
    console.warn("selectFlavorTime, flavor is null")
    return null;
  }

  // We start looking from the end because the mechanism breaks if there are
  // multiple identical times.
  let previousIndex = null;
  for (let i=flavor.times.length-1; i>-1; i--) {
    let time = Date.parse(flavor.times[i].time)
    if (time === previousTime) {
      previousIndex = i
      break
    }
  }

  // TODO: if no exact match is found, choose the next one chronologically.
  if (previousIndex != null) {
    let nextIndex = previousIndex + 1
    if (nextIndex == flavor.times.length) {
      nextIndex = 0
    }
    return Date.parse(flavor.times[nextIndex].time)
  }

  return Date.parse(flavor.times[0].time)
}


const reduceValidSelection = (state) => {
  const selectedSite = selectSite(state.selection.site[0], state.catalog);
  const selectedProduct = selectProduct(state.selection.product[0], selectedSite[1]);
  const selectedFlavor = selectFlavor(state.selection.flavor[0], selectedProduct[1]);

  return Object.assign({}, state,
                       {'selection':  {site: selectedSite,
                                       product: selectedProduct,
                                       flavor: selectedFlavor}})
}


const reduceValidAnimationTime = (state) => {
  const currentTime = selectFlavorTime(state.selection.flavor[1], null)
  const nextTime = selectFlavorTime(state.selection.flavor[1], currentTime)

  state = Object.assign({}, state)
  let animation = Object.assign({}, state.animation)
  animation.currentProductTime = currentTime
  animation.nextProductTime = nextTime
  state.animation = animation
  return state
}


const catalogUpdatedReducer = (state, action) => {
  state = Object.assign({}, state)
  state.catalog = action.payload;
  state = reduceValidSelection(state)

  state = reduceValidAnimationTime(state)
  return state
}


const siteSelectedReducer = (state, action) => {
  state = Object.assign({}, state)

  let selectedSite = [action.payload, state.catalog[action.payload]]
  if (selectedSite[1] == undefined) {
    selectedSite = selectSite(state.selection.site[0], state.catalog);
  }
  let siteChanged = state.selection.site[0] != selectedSite[0]
  state.selection = Object.assign({}, state.selection, {site: selectedSite})

  if (siteChanged) {
    state = makeCurrentSiteIntendedReducer(state)
  }

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const productSelectedReducer = (state, action) => {
  state = Object.assign({}, state)

  let selectedProduct = [action.payload, state.selection.site[1].products[action.payload]]
  if (selectedProduct[1] == undefined) {
    selectedProduct = selectProduct(state.selection.product[0], selectedSite);
  }
  state.selection.product = selectedProduct

  state = reduceValidSelection(state)
  state = reduceValidAnimationTime(state)
  return state
}


const flavorSelectedReducer = (state, action) => {
  state = Object.assign({}, state)

  let selectedFlavor = [action.payload, state.selection.product[1].flavors[action.payload]]
  if (selectedFlavor[1] == undefined) {
    selectedFlavor = selectFlavor(state.selection.flavor[0], state.selection.product);
  }
  state.selection.flavor = selectedFlavor

  state = reduceValidSelection(state)
  state = reduceValidAnimationTime(state)
  return state
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
                                       centerLon: state.selection.site[1].lon,
                                       centerLat: state.selection.site[1].lat,
                                     })
  return state
}


const cycleSiteReducer = (state, action) => {
  let options = Object.keys(state.catalog)
  options.sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.site[0])
  let newIndex = current + 1 == options.length ? 0 : current + 1

  let newSite = [options[newIndex], state.catalog[options[newIndex]]]
  let siteChanged = state.selection.site[0] != newSite[0]

  state = Object.assign({}, state)
  state.selection = Object.assign({}, state.selection, {site: newSite})

  if (siteChanged) {
    state = makeCurrentSiteIntendedReducer(state)
  }

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const cycleProductReducer = (state, action) => {
  let options = Object.keys(state.selection.site[1].products)
  options.sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.product[0])
  let newIndex = current + 1 == options.length ? 0 : current + 1

  let newProduct = [options[newIndex], state.selection.site[1].products[options[newIndex]]]
  state = Object.assign({}, state)
  state.selection = Object.assign({}, state.selection, {product: newProduct})

  return reduceValidAnimationTime(reduceValidSelection(state))
}


const cycleFlavorReducer = (state, action) => {
  let options = Object.keys(state.selection.product[1].flavors)
  options.sort()

  // returns -1 if not found, which is handy as we just select the first then
  const current = options.indexOf(state.selection.flavor[0])
  let newIndex = current + 1 == options.length ? 0 : current + 1

  let newFlavor = [options[newIndex], state.selection.product[1].flavors[options[newIndex]]]
  state = Object.assign({}, state)
  state.selection = Object.assign({}, state.selection, {flavor: newFlavor})

  return reduceValidAnimationTime(state)
}


const animationTickReducer = (state, action) => {
  state = Object.assign({}, state)
  state.animation = Object.assign({}, state.animation)
  state.animation.nextProductTime = selectFlavorTime(state.selection.flavor[1], state.animation.nextProductTime)
  return state
}


const tickClickedReducer = (state, action) => {
  state = Object.assign({}, state)
  state.animation = Object.assign({}, state.animation)
  state.animation.nextProductTime = action.payload
  return state
}


const forwardBackwardReducer = (state, forward) => {
  let times = state.selection.flavor[1].times
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

  state = Object.assign({}, state)
  state.animation = Object.assign({}, state.animation, {nextProductTime: newTime})
  return state
}


const tickForwardReducer = (state, action) => {
  return forwardBackwardReducer(state, true)
}


const tickBackwardReducer = (state, action) => {
  return forwardBackwardReducer(state, false)
}


const productTimeReducer = (state, action) => {
  state = Object.assign({}, state)
  state.animation = Object.assign(
    {}, state.animation,
    {currentProductTime: action.payload})
  return state
}


const toggleAnimationReducer = (state, action) => {
  let previousRunning = state.animation.running
  state = Object.assign({}, state)
  state.animation = Object.assign(
    {}, state.animation,
    {running: previousRunning ? false : true})
  return state
}


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
    state = {
      selection: {
        site: [null, null],
        product: [null, null],
        flavor: [null, null]
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
        nextProductTime: null, // the product time we want to show next
        currentProductTime: null, // the product time we are currently showing
        running: true
      }
    }
  } else if (action.type === ObserverActions.CATALOG_UPDATED) {
    state = catalogUpdatedReducer(state, action);
  } else if (action.type === ObserverActions.SITE_SELECTED) {
    state = siteSelectedReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_SITE) {
    state = cycleSiteReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_PRODUCT) {
    state = cycleProductReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_FLAVOR) {
    state = cycleFlavorReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_SELECTED) {
    state = productSelectedReducer(state, action);
  } else if (action.type === ObserverActions.FLAVOR_SELECTED) {
    state = flavorSelectedReducer(state, action);
  } else if (action.type === ObserverActions.MAP_CENTER_CHANGED) {
    state = mapCenterChangedReducer(state, action)
  } else if (action.type === ObserverActions.MAP_MOVED) {
    state = mapMovedReducer(state, action)
  } else if (action.type === ObserverActions.MAKE_CURRENT_SITE_INTENDED) {
    state = makeCurrentSiteIntendedReducer(state)
  } else if (action.type === ObserverActions.ANIMATION_TICK) {
    state = animationTickReducer(state, action);
  } else if (action.type === ObserverActions.TICK_CLICKED) {
    state = tickClickedReducer(state, action);
  } else if (action.type === ObserverActions.TICK_FORWARD) {
    state = tickForwardReducer(state, action);
  } else if (action.type === ObserverActions.TICK_BACKWARD) {
    state = tickBackwardReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_TIME_CHANGED) {
    state = productTimeReducer(state, action);
  } else if (action.type === ObserverActions.TOGGLE_ANIMATION) {
    state = toggleAnimationReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_LOAD_UPDATE) {
    state = productLoadUpdateReducer(state, action);
  }

  return state;
}
