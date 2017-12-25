import {ObserverActions} from "./constants/ObserverConstants"


const radarListFromIndex = (payloadRadars) => {
  let result = []
  for (let key in payloadRadars) {
    let radar = Object.assign({id: key}, payloadRadars[key])
    result.push(radar)
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result;
}


const selectRadar = (previousRadarSelection, radars) => {
  if (previousRadarSelection != null) {
    for (let index in radars) {
      let radar = radars[index];
      if (radar.id == previousRadarSelection.id) {
	return radar;
      }
    }
  } else {
    return radars.length > 0 ? radars[0] : null;
  }
}


const productListFromIndex = (currentRadar, payloadProducts) => {
  let result = []
  for (let key in payloadProducts) {
    let product = payloadProducts[key]
    if (product.radar == currentRadar.id) {
      result.push(Object.assign({id: key, display: product.name}, product))
    }
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result;
}


const selectProduct = (previousProductSelection, products) => {
  if (previousProductSelection != null) {
    for (let index in products) {
      let product = products[index];
      if (product.id == previousProductSelection.id) {
	return product;
      }
    }

    for (let index in products) {
      let product = products[index];
      if (product.name == previousProductSelection.name) {
	return product;
      }
    }
  }

  return products.length > 0 ? products[0] : null;
}


const flavorListFromProduct = (selectedProduct) => {
  if (selectedProduct == null) {
    return []
  }

  let result = []
  for (let key in selectedProduct.flavors) {
    result.push({id: key, display: key})
  }

  result.sort((a, b) => a.id.localeCompare(b.id))
  return result;
}


const selectFlavor = (previousFlavor, flavors) => {
  if (previousFlavor != null) {
    for (let index in flavors) {
      let flavor = flavors[index];
      if (flavor.id == previousFlavor.id) {
        return flavor;
      }
    }
  }

  return flavors.length > 0 ? flavors[0] : null;
}


const selectProductTime = (selection, products, previousTime) => {
  if (selection.flavor == null) {
    return null;
  }

  let result = [];
  for (let productKey in products) {
    let product = products[productKey]
    if (product.radar == selection.radar.id) {
      for (let flavorKey in product.flavors) {
	if (flavorKey == selection.flavor.id) {
	  let productInstances = product.flavors[flavorKey]
	  for (let idx in productInstances) {
	    let instance = productInstances[idx]
	    result.push(Date.parse(instance.time))
	  }
	}
      }
    }
  }
  result.sort()

  // We start looking from the end because the mechanism breaks if there are
  // multiple identical times.
  let previousIndex = null;
  for (let i=result.length-1; i>-1; i--) {
    let time = result[i]
    if (time === previousTime) {
      previousIndex = i
      break
    }
  }

  // TODO: if no exact match is found, choose the next one chronologically.
  if (previousIndex != null) {
    let nextIndex = previousIndex + 1
    if (nextIndex == result.length) {
      nextIndex = 0
    }
    return result[nextIndex]
  }

  return result[0]
}


const indexUpdatedReducer = (state, action) => {
  let radars = radarListFromIndex(action.payload.radars);
  let selectedRadar = selectRadar(state.selection.radar, radars);
  let products = productListFromIndex(selectedRadar, action.payload.products);
  let selectedProduct = selectProduct(state.selection.product, products);
  let flavors = flavorListFromProduct(selectedProduct);
  let selectedFlavor = selectFlavor(state.selection.flavor, flavors);

  state = Object.assign({}, state)
  state.index = {radars: action.payload.radars,
		 products: action.payload.products}
  state.selection = {radar: selectedRadar,
		     product: selectedProduct,
		     flavor: selectedFlavor}
  state.map = {centerLon: selectedRadar.lon,
	       centerLat: selectedRadar.lat,
	       onRadar: true}
  return state
}


const radarSelectedReducer = (state, action) => {
  let radars = radarListFromIndex(state.index.radars);
  let selectedRadar = null;
  for (let index in radars) {
    let radar = radars[index]
    if (radar.id == action.payload) {
      selectedRadar = radar
    }
  }
  if (selectedRadar == null) {
    selectedRadar = selectRadar(state.selection.radar, radars);
  }

  let products = productListFromIndex(selectedRadar, state.index.products);
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
  return state
}


const cycleRadarReducer = (state, action) => {
  let radars = radarListFromIndex(state.index.radars);
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
  let products = productListFromIndex(selectedRadar, state.index.products);
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
  let products = productListFromIndex(state.selection.radar, state.index.products);
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


const productSelectedReducer = (state, action) => {
  let radars = radarListFromIndex(state.index.radars);
  let selectedRadar = selectRadar(state.selection.radar, radars);
  let products = productListFromIndex(selectedRadar, state.index.products);

  let selectedProduct = null;
  for (let index in products) {
    let product = products[index]
    if (product.id == action.payload) {
      selectedProduct = product
    }
  }
  if (selectedProduct == null) {
    selectedProduct = selectProduct(state.selection.product, products);
  }

  let flavors = flavorListFromProduct(selectedProduct);
  let selectedFlavor = selectFlavor(state.selection.flavor, flavors);

  state = Object.assign({}, state)
  state.selection = {radar: selectedRadar,
		     product: selectedProduct,
		     flavor: selectedFlavor}
  return state
}


const flavorSelectedReducer = (state, action) => {
  let radars = radarListFromIndex(state.index.radars);
  let selectedRadar = selectRadar(state.selection.radar, radars);
  let products = productListFromIndex(selectedRadar, state.index.products);
  let selectedProduct = selectProduct(state.selection.product, products);

  let flavors = flavorListFromProduct(selectedProduct);
  let selectedFlavor = null;
  for (let index in flavors) {
    let flavor = flavors[index]
    if (flavor.id == action.payload) {
      selectedFlavor = flavor
    }
  }
  if (selectedFlavor == null) {
    selectedFlavor = selectFlavor(state.selection.flavor, flavors);
  }

  state = Object.assign({}, state)
  state.selection = {radar: selectedRadar,
		     product: selectedProduct,
		     flavor: selectedFlavor}
  return state
}


const animationTickReducer = (state, action) => {
  let products = productListFromIndex(state.selection.radar, state.index.products);
  state = Object.assign({}, state)
  state.animation = Object.assign(
    {}, state.animation,
    {nextProductTime: selectProductTime(state.selection, products, state.animation.nextProductTime)})
  return state
}


const productTimeReducer = (state, action) => {
  state = Object.assign({}, state)
  state.animation = Object.assign(
    {}, state.animation,
    {currentProductTime: action.payload})
  return state
}


export const reducer = (state, action) => {
  if (state === undefined) {
    return {
      selection: {
	radar: null,
	product: null,
	flavor: null
      },
      index: {
	radars: {},
	products: {}
      },
      map: {
	centerLon: 0,
	centerLat: 0,
	onRadar: false
      },
      animation: {
	nextProductTime: null, // the product time we want to show next
	currentProductTime: null, // the product time we are currently showing
	fps: 1,
	running: false
      }
    }
  }

  if (action.type === ObserverActions.INDEX_UPDATED) {
    state = indexUpdatedReducer(state, action);
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
  }

  return state;
}
