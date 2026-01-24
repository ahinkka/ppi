import pako from 'pako'

import { Component } from 'react'

import { twoDtoUint8Array } from './utils'
import { orderForLoading } from './product_time_loading_order'
import { Flavor } from './catalog'
import { DataValueType } from './components/datavalue'
import { AffineTransform } from './reprojection'


function inflate(input: Uint8Array): string {
  try {
    return pako.inflate(input, { to: 'string' })
  } catch (err) {
    console.error('Failed to decompress product file:', err)
    throw err
  }
}

export type LoadedProduct = {
  data: Uint8Array,
  _cols: number,
  _rows: number,
  metadata: {
    productInfo: {
      dataType: string,
      dataUnit: DataValueType,
      dataScale: {
	step: number,
	offset: number
	notScanned: number,
	noEcho: number
      }
    },
    projectionRef: string,
    width: number,
    height: number,
    affineTransform: AffineTransform
  }
}

async function parseProduct(input: Uint8Array): Promise<LoadedProduct> {
  let inflated = null
  try {
    inflated = inflate(input)
    const { data: twoDimensionalArray, metadata } = JSON.parse(inflated)
    const [_cols, _rows, data] = twoDtoUint8Array(twoDimensionalArray)
    return {
      data,
      _cols,
      _rows,
      metadata
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error(
        'Error parsing: ' + e + ' with input ' +
          inflated.substring(0, 20) +
          ' ... ' +
          inflated.substring(inflated.length - 20, inflated.length - 1)
      )
    } else {
      console.warn('Unhandled exception during product load', e)
    }
    throw e
  }
}

export type ProductUrlResolver = (flavor: Flavor, time: number) => string

const loadOneProduct = (
  onProductLoadUpdate: (payload: { loaded: string[], unloaded: string[] }) => void,
  productUrlResolver: ProductUrlResolver,
  loadedProducts: { [key: string]: LoadedProduct },
  loadingProducts: { [key: string]: Date },
  flavor: Flavor
) => {
  const removedUrls = new Set<string>()
  const loadingOrderedTimes = orderForLoading(flavor.times.map((t) => Date.parse(t.time)))
  const intendedUrls = loadingOrderedTimes.map((t) => productUrlResolver(flavor, t))

  const currentlyLoaded = new Set(Object.keys(loadedProducts))
  for (const url of currentlyLoaded) {
    if (!intendedUrls.includes(url)) {
      delete loadedProducts[url];
      removedUrls.add(url)
    }
  }

  let urlToLoad = null
  // Then start loading actual products
  for (const url of intendedUrls) {
    if ((url in loadedProducts) || (url in loadingProducts)) {
      continue
    }

    urlToLoad = url
    break
  }

  if (!urlToLoad) {
    return
  }

  loadingProducts[urlToLoad] = new Date()

  fetch(urlToLoad)
    .then((response) => response.bytes())
    .then(parseProduct)
    .then((parsed) => {
      loadedProducts[urlToLoad] = parsed
      onProductLoadUpdate({
        loaded: [urlToLoad],
        unloaded: Array.from(removedUrls)
      })
    })
    .catch((e) => {
      console.error(`Failed to load product from url ${urlToLoad}`, e)
    })
    .finally(() => {
      delete loadingProducts[urlToLoad]
    })
}

type Props = {
  selectedFlavor: Flavor,
  loadedProducts: { [key: string]: null | undefined },
  productUrlResolver: ProductUrlResolver,
  setProductRepositoryObject: (obj: { [key: string]: null | undefined }) => void,
  onProductLoadUpdate: (payload: { loaded: string[], unloaded: string[] }) => void
}

export class ProductLoader extends Component<Props> {
  private loadedProducts: { [key: string]: null | undefined } = {}
  private loadingProducts: { [key: string]: Date } = {}

  constructor(props: Readonly<Props> | Props) {
    super(props)
  }

  componentDidMount() {
    this.props.setProductRepositoryObject(this.loadedProducts)
  }

  render(): null {
    const props = this.props
    const flavor = props.selectedFlavor

    if (!flavor) {
      return null
    }

    const l = () =>
      loadOneProduct(
        props.onProductLoadUpdate,
        props.productUrlResolver,
        this.loadedProducts, this.loadingProducts,
        props.selectedFlavor
      )
    setTimeout(l, 0)

    return null
  }
}
