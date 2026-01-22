import { Component } from 'react'

import { ObserverActions, ObserverDispatch } from './constants'

export type FlavorTime = {
  time: string,
  url: string
}

export type Flavor = {
  display: string,
  times: FlavorTime[]
}

export type CatalogProduct = {
  display: string,
  flavors: { [flavorId: string]: Flavor }
}

export type Site = {
  display: string,
  products: { [productId: string]: CatalogProduct }
  lat: number,
  lon: number
}

export type RadarProducts = {
  [siteId: string]: Site
}

export type Catalog = {
  radarProducts: RadarProducts
}

type CatalogProviderProps = {
  dispatch: ObserverDispatch,
  url: string
}

class CatalogProvider extends Component<CatalogProviderProps> {
  private intervalId: number | null
  private initialTimeoutId: number | null

  constructor(props: Readonly<CatalogProviderProps> | CatalogProviderProps) {
    super(props)
    this.intervalId = null
    this.initialTimeoutId = null
  }

  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    const update = () => {
      fetch(url)
        .then((response) => response.json())
        .then((obj) => {
          dispatch({ type: ObserverActions.CATALOG_UPDATED, payload: obj })
        })
    }

    this.intervalId = window.setInterval(update, 30000)
    this.initialTimeoutId = window.setTimeout(update, 0)
  }

  componentWillUnmount() {
    if (this.intervalId) window.clearInterval(this.intervalId)
    if (this.initialTimeoutId) window.clearTimeout(this.initialTimeoutId)
  }

  render() {
    return null
  }
}

export default CatalogProvider
