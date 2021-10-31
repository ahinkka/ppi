export type RadarProducts = {
  [key: string]: never
}

export type Catalog = {
  radarProducts: RadarProducts
}

export type FlavorTime = {
  time: string,
  url: string
}

export type Flavor = {
  times: FlavorTime[]
}

type Product = {
  flavors: Flavor[]
}

type Site = {
  products: Product[]
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
  geoInterests: any
}

