import React, { Dispatch } from 'react'
import { format as formatDate } from 'date-fns'
import { connect } from 'react-redux'

import { Action } from './action'
import { State } from './state'
import { Flavor } from './catalog'
import { LoadedProduct } from './product_loader'

import DropdownSelector from './dropdown_selector'
import { Map } from './map'
import { ToggleButton } from './toggle_button'
import ProductSlider from './product_slider'
import ColorScale from './color_scale'
import { NOAAScaleToScaleDescription } from './coloring'
import HclassColorScale from './hclass_color_scale'

const _NOAAReflectivityColorScale = NOAAScaleToScaleDescription()


const siteSelections = (radarProducts: State['catalog']['radarProducts']): Array<{id: string, display: string}> => {
  const result: Array<{id: string, display: string}> = []
  for (const siteId in radarProducts) {
    result.push({ id: siteId, display: radarProducts[siteId].display })
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const productSelections = (site: State['selection']['site']): Array<{id: string, display: string}> => {
  const result: Array<{id: string, display: string}> = []
  for (const productId in site.products) {
    result.push({ id: productId, display: site.products[productId].display })
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const flavorSelections = (product: State['selection']['product']): Array<{id: string, display: string}> => {
  const result: Array<{id: string, display: string}> = []
  for (const flavorId in product.flavors) {
    result.push({ id: flavorId, display: product.flavors[flavorId].display })
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}


const handleKeyPress = (dispatch: Dispatch<Action>, event: KeyboardEvent): void => {
  const key = String.fromCharCode(event.charCode)
  if (key == 's' || key == 'S') {
    dispatch({ type: 'cycle site' })
  } else if (key == 'p' || key == 'P') {
    dispatch({ type: 'cycle product' })
  } else if (key == 'f' || key == 'F') {
    dispatch({ type: 'cycle flavor' })
  } else if (event.keyCode == 32) {
    dispatch({ type: 'toggle animation' })
  }

  // TODO: bind shift + arrows for navigating the map
  // TODO: bind + and - for zooming the map
}


const handleKeyDown = (dispatch: Dispatch<Action>, event: KeyboardEvent): void => {
  const key = event.key
  if (key == 'ArrowRight') {
    dispatch({ type: 'tick forward' })
  } else if (key == 'ArrowLeft') {
    dispatch({ type: 'tick backward' })
  }
}


const TimeDisplay = (props: { currentValue: number | null }): React.ReactElement => {
  const display = formatDate(new Date(props.currentValue), 'yyyy-MM-dd HH:mm:ss') + ' UTC'
  const title = 'Current displayed product time is ' + display
  return (
    <div title={title} className="h5" id="product-time">{display}</div>
  )
}


export type ObserverAppProps = State & {
  dispatch: Dispatch<Action>,
  productUrlResolver: (flavor: Flavor, currentProductTime: State['animation']['currentProductTime']) => string | null,
  getProductByUrl: (url: string | null) => unknown
}


class ObserverApp extends React.Component<ObserverAppProps> {
  private initialAnimationTimerToken?: ReturnType<typeof setTimeout>
  private animationTimerToken?: ReturnType<typeof setInterval>
  private animationTick?: () => void | undefined
  private onKeyPress?: (event: KeyboardEvent) => void
  private onKeyDown?: (event: KeyboardEvent) => void

  constructor(props: ObserverAppProps) {
    super(props)
  }

  componentDidMount() {
    this.animationTick = () =>
      this.props.animation.running
        ? this.props.dispatch({ type: 'animation tick' })
        : undefined

    this.initialAnimationTimerToken = setTimeout(this.animationTick, 500)
    this.animationTimerToken = setInterval(this.animationTick, 1500)

    this.onKeyPress = (event) => handleKeyPress(this.props.dispatch, event)
    this.onKeyDown = (event) => handleKeyDown(this.props.dispatch, event)
    document.addEventListener('keypress', this.onKeyPress)
    document.addEventListener('keydown', this.onKeyDown)
  }

  componentWillUnmount() {
    if (this.initialAnimationTimerToken) clearTimeout(this.initialAnimationTimerToken)
    if (this.animationTimerToken) clearInterval(this.animationTimerToken)
    document.removeEventListener('keypress', this.onKeyPress)
    document.removeEventListener('keydown', this.onKeyDown)
  }

  render() {
    const props = this.props

    const { siteId, productId, flavorId, flavor, site, product } = props.selection
    if (!siteId || !productId || !flavorId) {
      return (<div></div>)
    }

    const { currentProductTime } = props.animation
    const productUrl = props.productUrlResolver(flavor, currentProductTime)

    const tickClickCallback = (time: number) => {
      return () =>  props.dispatch({ type: 'tick clicked', payload: time })
    }

    const keyBase = [siteId, productId, flavorId]
    const tickItems = flavor.times.map((flavorTime) => {
      const time = Date.parse(flavorTime.time)
      const callback = tickClickCallback(time)
      const isCurrent = time === currentProductTime
      const isLoaded = !!props.getProductByUrl(props.productUrlResolver(flavor, time))
      const key = [...keyBase, flavorTime.time].join('-')
      return { time, callback, isCurrent, isLoaded, key }
    })

    let loadedProduct: LoadedProduct | null = null
    if (productUrl in props.loadedProducts) {
      loadedProduct = props.getProductByUrl(productUrl) as LoadedProduct
    }

    let colorScale: React.ReactElement = (<React.Fragment />)
    if (loadedProduct?.metadata.productInfo.dataType === 'REFLECTIVITY') {
      colorScale = (<ColorScale name={'NOAA Reflectivity Scale'} unit={'dBZ'} type={'Reflectivity'} ranges={_NOAAReflectivityColorScale} />)
    } else if (loadedProduct?.metadata.productInfo.dataType === 'hclass') {
      colorScale = (<HclassColorScale />)
    }

    return (
      <div>
        <div id="header-row">
          <div id="header-row__selector-container">
            <DropdownSelector
              currentValue={siteId}
              legend="Site"
              items={siteSelections(props.catalog.radarProducts)}
              tooltip="Press S to cycle sites"
              tooltipId="site-tooltip"
              action={'site selected'}
              disabled={false} />
            <DropdownSelector
              currentValue={productId}
              legend="Product"
              items={productSelections(site)}
              tooltip="Press P to cycle products"
              tooltipId="product-tooltip"
              action={'product selected'}
              disabled={false} />
            <DropdownSelector
              currentValue={flavorId}
              legend="Flavor"
              items={flavorSelections(product)}
              tooltip="Press F to cycle flavors"
              tooltipId="flavor-tooltip"
              action={'flavor selected'}
              disabled={false} />
          </div>
          <div id="play-controls">
            <ToggleButton toggleStatus={props.animation.running}
              onSymbol="&#9616;&nbsp;&#9612;" offSymbol="&nbsp;&#9658;&nbsp;"
              action={'toggle animation'}
              tooltip="Press SPACE to toggle animation" />
            <ProductSlider ticks={tickItems} />
          </div>
          <TimeDisplay currentValue={currentProductTime} />
        </div>
        <Map headerElementId="header-row"
          intendedCenter={[props.map.intended.centerLon, props.map.intended.centerLat]}
          geoInterests={props.geoInterests}
          dispatch={props.dispatch}
          product={loadedProduct}
          productTime={currentProductTime}
          productSelection={[siteId, productId, flavorId]}
        />
        {colorScale}
      </div>
    )
  }
}


const mapStateToProps = (state: State): State => {
  return state
}
export default connect(mapStateToProps)(ObserverApp)
