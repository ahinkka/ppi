import { Dispatch } from 'react'
import { Catalog } from './catalog'

export type ActionType =
  | 'prime'
  | 'catalog updated'
  | 'geointerests updated'
  | 'site selected'
  | 'product selected'
  | 'flavor selected'
  | 'cycle site'
  | 'cycle product'
  | 'cycle flavor'
  | 'map center changed'
  | 'map moved'
  | 'make current site intended'
  | 'pointer moved'
  | 'pointer left map'
  | 'animation tick'
  | 'toggle animation'
  | 'tick clicked'
  | 'tick forward'
  | 'tick backward'
  | 'product load update'

export type LonLatPayload = {
  lon: number
  lat: number
}

export type ProductLoadPayload = {
  loaded: string[]
  unloaded: string[]
}

export type PointerCoordinate = number[]

export type Action =
  | { type: 'prime' }
  | { type: 'cycle site' }
  | { type: 'cycle product' }
  | { type: 'cycle flavor' }
  | { type: 'make current site intended' }
  | { type: 'pointer left map' }
  | { type: 'animation tick' }
  | { type: 'toggle animation' }
  | { type: 'tick forward' }
  | { type: 'tick backward' }

  | { type: 'catalog updated'; payload: Catalog }
  | { type: 'geointerests updated'; payload: unknown }
  | { type: 'site selected'; payload: string }
  | { type: 'product selected'; payload: string }
  | { type: 'flavor selected'; payload: string }
  | { type: 'map center changed'; payload: LonLatPayload }
  | { type: 'map moved'; payload: LonLatPayload }
  | { type: 'pointer moved'; payload: PointerCoordinate }
  | { type: 'tick clicked'; payload: number }
  | { type: 'product load update'; payload: ProductLoadPayload }

// Helper types for components with runtime-determined action types
export type StringPayloadAction = Extract<Action, { payload: string }>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoPayloadAction = Exclude<Action, { payload: any }>

export type ObserverDispatch = Dispatch<Action>
