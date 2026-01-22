import React from 'react'
import moment from 'moment';
import { connect } from 'react-redux'
import * as O from 'optics-ts'

import { ObserverActions, ObserverDispatch } from '../constants'
import { State } from '../state'
import {
  animationRunningL,
  selectedSiteIdL,
  selectedProductIdL,
  selectedFlavorIdL,
  selectedFlavorL,
  currentProductTimeL,
  radarProductsL,
  geoInterestsL
} from '../state'
import { Flavor } from '../catalog'

import DropdownSelector from './dropdown_selector'
import {Map} from './map'
import {ToggleButton} from './toggle_button'
import ProductSlider from './product_slider'
import ColorScale from './color_scale'
import {NOAAScaleToScaleDescription} from './coloring'

const _NOAAReflectivityColorScale = NOAAScaleToScaleDescription()


const siteSelections = (radarProducts: State['catalog']['radarProducts']): Array<{id: string, display: string}> => {
  const result: Array<{id: string, display: string}> = []
  for (const siteId in radarProducts) {
    result.push({id: siteId, display: radarProducts[siteId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const productSelections = (site: State['selection']['site']): Array<{id: string, display: string}> => {
  const result: Array<{id: string, display: string}> = []
  for (const productId in site.products) {
    result.push({id: productId, display: site.products[productId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

const flavorSelections = (product: State['selection']['product']): Array<{id: string, display: string}> => {
  const result: Array<{id: string, display: string}> = []
  for (const flavorId in product.flavors) {
    result.push({id: flavorId, display: product.flavors[flavorId].display})
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}


const handleKeyPress = (dispatch: ObserverDispatch, event: KeyboardEvent): void => {
  const key = String.fromCharCode(event.charCode)
  if (key == 's' || key == 'S') {
    dispatch({type: ObserverActions.CYCLE_SITE})
  } else if (key == 'p' || key == 'P') {
    dispatch({type: ObserverActions.CYCLE_PRODUCT})
  } else if (key == 'f' || key == 'F') {
    dispatch({type: ObserverActions.CYCLE_FLAVOR})
  } else if (event.keyCode == 32) {
    dispatch({type: ObserverActions.TOGGLE_ANIMATION})
  }

  // TODO: bind shift + arrows for navigating the map
  // TODO: bind + and - for zooming the map
}


const handleKeyDown = (dispatch: ObserverDispatch, event: KeyboardEvent): void => {
  const key = event.key
  if (key == 'ArrowRight') {
    dispatch({type: ObserverActions.TICK_FORWARD})
  } else if (key == 'ArrowLeft') {
    dispatch({type: ObserverActions.TICK_BACKWARD})
  }
}


const TimeDisplay = (props: { currentValue: number | null }): React.ReactElement => {
  const display = moment.utc(props.currentValue).format('YYYY-MM-DD HH:mm:ss') + ' UTC'
  const title = 'Current displayed product time is ' + display
  return (
    <div title={title} className="h5" id="product-time">{display}</div>
  );
}


export type ObserverAppProps = State & {
  dispatch: ObserverDispatch,
  productUrlResolver: (flavor: Flavor, currentProductTime: State['animation']['currentProductTime']) => string | null,
  getProductByUrl: (url: string | null) => unknown
}


class ObserverApp extends React.Component<ObserverAppProps> {
  private initialAnimationTimerToken?: ReturnType<typeof setTimeout>
  private animationTimerToken?: ReturnType<typeof setInterval>
  private _animationTick?: () => void | undefined
  private _onKeyPress?: (event: KeyboardEvent) => void
  private _onKeyDown?: (event: KeyboardEvent) => void

  constructor(props: ObserverAppProps) {
    super(props);
  }

  componentDidMount() {
    this._animationTick = () =>
      O.get(animationRunningL)(this.props) ? this.props.dispatch({type: ObserverActions.ANIMATION_TICK}) : undefined

    this.initialAnimationTimerToken = setTimeout(this._animationTick, 500)
    this.animationTimerToken = setInterval(this._animationTick, 1500)

    this._onKeyPress = (event) => handleKeyPress(this.props.dispatch, event)
    this._onKeyDown = (event) => handleKeyDown(this.props.dispatch, event)
    document.addEventListener('keypress', this._onKeyPress)
    document.addEventListener('keydown', this._onKeyDown)
  }

  componentWillUnmount() {
    if (this.initialAnimationTimerToken) clearTimeout(this.initialAnimationTimerToken)
    if (this.animationTimerToken) clearInterval(this.animationTimerToken)
    document.removeEventListener('keypress', this._onKeyPress)
    document.removeEventListener('keydown', this._onKeyDown)
  }

  render() {
    const props = this.props
    const [siteId, productId, flavorId] = [
      O.get(selectedSiteIdL)(props),
      O.get(selectedProductIdL)(props),
      O.get(selectedFlavorIdL)(props)
    ]

    if (!siteId || !productId || !flavorId) {
      return (<div></div>)
    }

    const flavor = O.get(selectedFlavorL)(props)
    const currentProductTime = O.get(currentProductTimeL)(props)
    const productUrl = props.productUrlResolver(flavor, currentProductTime)

    const tickClickCallback = (time: number) => {
      return () =>  props.dispatch({ type: ObserverActions.TICK_CLICKED, payload: time })
    }

    const keyBase = [siteId, productId, flavorId]
    const tickItems = flavor.times.map((flavorTime) => {
      const time = Date.parse(flavorTime.time)
      const callback = tickClickCallback(time)
      const isCurrent = time === currentProductTime
      const isLoaded = !!props.getProductByUrl(props.productUrlResolver(props.selection.flavor, time))
      const key = [...keyBase, flavorTime.time].join('-')
      return { time, callback, isCurrent, isLoaded, key }
    })

    let product = null
    if (productUrl in props.loadedProducts) {
      product = props.getProductByUrl(productUrl)
    }

    return (
      <div>
        <div id="header-row">
          <div id="header-row__selector-container">
            <DropdownSelector
              currentValue={props.selection.siteId}
              legend="Site"
              items={siteSelections(O.get(radarProductsL)(props))}
              tooltip="Press S to cycle sites"
              tooltipId="site-tooltip"
              action={ObserverActions.SITE_SELECTED}
              disabled={false}
              dispatch={props.dispatch} />
            <DropdownSelector
              currentValue={props.selection.productId}
              legend="Product"
              items={productSelections(props.selection.site)}
              tooltip="Press P to cycle products"
              tooltipId="product-tooltip"
              action={ObserverActions.PRODUCT_SELECTED}
              disabled={false}
              dispatch={props.dispatch} />
            <DropdownSelector
              currentValue={props.selection.flavorId}
              legend="Flavor"
              items={flavorSelections(props.selection.product)}
              tooltip="Press F to cycle flavors"
              tooltipId="flavor-tooltip"
              action={ObserverActions.FLAVOR_SELECTED}
              disabled={false}
              dispatch={props.dispatch} />
          </div>
          <div id="play-controls">
            <ToggleButton toggleStatus={props.animation.running} dispatch={props.dispatch}
              onSymbol="&#9616;&nbsp;&#9612;" offSymbol="&nbsp;&#9658;&nbsp;"
              action={ObserverActions.TOGGLE_ANIMATION}
              tooltip="Press SPACE to toggle animation" />
            <ProductSlider ticks={tickItems} dispatch={props.dispatch} />
          </div>
          <TimeDisplay currentValue={props.animation.currentProductTime} />
        </div>
        <Map headerElementId="header-row"
          intendedCenter={[props.map.intended.centerLon, props.map.intended.centerLat]}
          geoInterests={O.get(geoInterestsL)(props)}
          dispatch={props.dispatch}
          product={product}
          productTime={props.animation.currentProductTime}
          productSelection={[props.selection.siteId, props.selection.productId, props.selection.flavorId]} />
        <ColorScale name={'NOAA Reflectivity Scale'} unit={'dBZ'} type={'Reflectivity'}
          ranges={_NOAAReflectivityColorScale} />
      </div>
    )
  }
}


const mapStateToProps = (state: State): State => {
  return state
}
export default connect(mapStateToProps)(ObserverApp)
