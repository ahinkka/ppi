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

