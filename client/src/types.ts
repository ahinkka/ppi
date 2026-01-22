export type RadarProducts = {
  [siteId: string]: Site
}

export type Catalog = {
  radarProducts: RadarProducts
}

export type FlavorTime = {
  time: string,
  url: string
}

export type Flavor = {
  display: string,
  times: FlavorTime[]
}

export type Product = {
  display: string,
  flavors: { [flavorId: string]: Flavor }
}

export type Site = {
  display: string,
  products: { [productId: string]: Product }
  lat: number,
  lon: number
}

export type State = {
  catalog: Catalog,
  selection: {
    siteId: string | null,
    productId: string | null,
    flavorId: string | null,

    site: Site | null,
    product: Product | null,
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

