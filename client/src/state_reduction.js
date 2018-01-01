import {ObserverActions} from "./constants"


const selectRadar = (previousRadarSelection, catalog) => {
  if (previousRadarSelection != null) {
    for (const radarId in catalog) {
      if (radarId == previousRadarSelection) {
        return [radarId, catalog[radarId]]
      }
    }
  } else {
    let options = Object.keys(catalog)
    options.sort()
    return options.length > 0 ? [options[0], catalog[options[0]]] : [null, null];
  }
}


const selectProduct = (previousProductSelection, radar) => {
  if (previousProductSelection != null) {
    for (const productId in radar.products) {
      if (productId == previousProductSelection) {
        return [productId, radar.products[productId]]
      }
    }
  } else {
    let options = Object.keys(radar.products)
    options.sort()
    return options.length > 0 ? [options[0], radar.products[options[0]]] : [null, null];
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
  const selectedRadar = selectRadar(state.selection.radar[0], state.catalog);
  const selectedProduct = selectProduct(state.selection.product[0], selectedRadar[1]);
  const selectedFlavor = selectFlavor(state.selection.flavor[0], selectedProduct[1]);

  return Object.assign({}, state,
                       {'selection':  {radar: selectedRadar,
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


  if (state.map.centerLon === undefined ||
      (Math.abs(state.map.centerLon) < 0.000000001)) {
    state.map = {centerLon: state.selection.radar[1].lon,
                 centerLat: state.selection.radar[1].lat,
                 onRadar: true}
  }

  state = reduceValidAnimationTime(state)
  return state
}


const radarSelectedReducer = (state, action) => {
  state = Object.assign({}, state)

  let selectedRadar = [action.payload, state.catalog[action.payload]]
  if (selectedRadar[1] == undefined) {
    selectedRadar = selectRadar(state.selection.radar[0], state.catalog);
  }
  state.selection.radar = selectedRadar
  state = reduceValidSelection(state)

  state = reduceValidAnimationTime(state)

  if (state.selection.radar[0] != selectedRadar[0]) {
    state.map = {centerLon: state.selection.radar[1].lon,
                 centerLat: state.selection.radar[1].lat,
                 onRadar: true}
  }

  return state
}


const productSelectedReducer = (state, action) => {
  state = Object.assign({}, state)

  let selectedProduct = [action.payload, state.selection.radar[1].products[action.payload]]
  if (selectedProduct[1] == undefined) {
    selectedProduct = selectProduct(state.selection.product[0], selectedRadar);
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


const cycleRadarReducer = (state, action) => {
  // TODO: fix
  let radars = radarListFromCatalog(state.catalog.radars);
  let currentIndex = -1;
  for (let index in radars) {
    let radar = radars[index]
    if (radar.id == state.selection.radar.id) {
      currentIndex = Number.parseInt(index);
      break;
    }
  }
  let nextIndex = currentIndex + 1;
  if (nextIndex == radars.length) {
    nextIndex = 0
  }
  let selectedRadar = radars[nextIndex];
  let products = productListFromCatalog(selectedRadar, state.catalog.products);
  let selectedProduct = selectProduct(state.selection.product, products);
  let flavors = flavorListFromProduct(selectedProduct);
  let selectedFlavor = selectFlavor(state.selection.flavor, flavors);
  state = Object.assign({}, state)
  state.selection = {radar: selectedRadar,
                     product: selectedProduct,
                     flavor: selectedFlavor}
  state.map = {centerLon: selectedRadar.lon,
               centerLat: selectedRadar.lat,
               onRadar: true}
  return state;
}


const cycleProductReducer = (state, action) => {
  // TODO: fix
  let products = productListFromCatalog(state.selection.radar, state.catalog.products);
  let currentIndex = -1;
  for (let index in products) {
    let product = products[index]
    if (product.id == state.selection.product.id) {
      currentIndex = Number.parseInt(index);
      break;
    }
  }
  let nextIndex = currentIndex + 1;
  if (nextIndex == products.length) {
    nextIndex = 0
  }
  let selectedProduct = products[nextIndex];
  let flavors = flavorListFromProduct(selectedProduct);
  let selectedFlavor = selectFlavor(state.selection.flavor, flavors);
  state = Object.assign({}, state)
  state.selection = {radar: state.selection.radar,
                     product: selectedProduct,
                     flavor: selectedFlavor}
  return state
}


const cycleFlavorReducer = (state, action) => {
  // TODO: fix
  let flavors = flavorListFromProduct(state.selection.product);
  let currentIndex = -1;
  for (let index in flavors) {
    let flavor = flavors[index]
    if (flavor.id == state.selection.flavor.id) {
      currentIndex = Number.parseInt(index);
      break
    }
  }
  let nextIndex = currentIndex + 1;
  if (nextIndex == flavors.length) {
    nextIndex = 0
  }

  state = Object.assign({}, state)
  state.selection = {radar: state.selection.radar,
                     product: state.selection.product,
                     flavor: flavors[nextIndex]}
  return state
}


const animationTickReducer = (state, action) => {
  state = Object.assign({}, state)
  state.animation = Object.assign({}, state.animation)
  state.animation.nextProductTime = selectFlavorTime(state.selection.flavor[1], state.animation.nextProductTime)
  return state
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
  if (state === undefined) {
    return {
      selection: {
        radar: [null, null],
        product: [null, null],
        flavor: [null, null]
      },
      catalog: {},
      loadedProducts: {}, // urls as keys, null values
      map: {
        centerLon: 0,
        centerLat: 0,
        onRadar: false
      },
      animation: {
        nextProductTime: null, // the product time we want to show next
        currentProductTime: null, // the product time we are currently showing
        running: true
      }
    }
  }

  if (action.type === ObserverActions.CATALOG_UPDATED) {
    state = catalogUpdatedReducer(state, action);
  } else if (action.type === ObserverActions.RADAR_SELECTED) {
    state = radarSelectedReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_RADAR) {
    state = cycleRadarReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_PRODUCT) {
    state = cycleProductReducer(state, action);
  } else if (action.type === ObserverActions.CYCLE_FLAVOR) {
    state = cycleFlavorReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_SELECTED) {
    state = productSelectedReducer(state, action);
  } else if (action.type === ObserverActions.FLAVOR_SELECTED) {
    state = flavorSelectedReducer(state, action);
  } else if (action.type === ObserverActions.EXTENT_CHANGED) {
    state = Object.assign({}, state)
    state.map = {centerLon: action.payload.lon,
                 centerLat: action.payload.lat,
                 onRadar: false}
  } else if (action.type === ObserverActions.ANIMATION_TICK) {
    state = animationTickReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_TIME_CHANGED) {
    state = productTimeReducer(state, action);
  } else if (action.type === ObserverActions.TOGGLE_ANIMATION) {
    state = toggleAnimationReducer(state, action);
  } else if (action.type === ObserverActions.PRODUCT_LOAD_UPDATE) {
    state = productLoadUpdateReducer(state, action);
  }

  return state;
}
