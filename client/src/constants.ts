import { Dispatch } from 'react'

export enum ObserverActions {
  PRIME = 'prime',
  CATALOG_UPDATED = 'catalog updated',
  GEOINTERESTS_UPDATED = 'geointerests updated',

  SITE_SELECTED = 'site selected',
  PRODUCT_SELECTED = 'product selected',
  FLAVOR_SELECTED = 'flavor selected',

  CYCLE_SITE = 'cycle site',
  CYCLE_PRODUCT = 'cycle product',
  CYCLE_FLAVOR = 'cycle flavor',

  MAP_CENTER_CHANGED = 'map center changed',
  MAP_MOVED = 'map moved',
  MAKE_CURRENT_SITE_INTENDED = 'make current site intended',

  POINTER_MOVED = 'pointer moved',
  POINTER_LEFT_MAP = 'pointer left map',

  ANIMATION_TICK = 'animation tick',
  TOGGLE_ANIMATION = 'toggle animation',
  TICK_CLICKED = 'tick clicked',
  TICK_FORWARD = 'tick forward',
  TICK_BACKWARD = 'tick backward',

  PRODUCT_LOAD_UPDATE = 'product load update',
}

export type ObserverDispatch = Dispatch<{ type: ObserverActions, payload?: unknown }>
