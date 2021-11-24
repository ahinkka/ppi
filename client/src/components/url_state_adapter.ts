import { Component } from 'react'

import { batch, connect } from 'react-redux'

import { UrlState, makeHashFromState, parseHash } from '../state_hash'
import { State, Catalog } from '../types'
import { ObserverActions, ObserverDispatch } from '../constants'


type Props = UrlState & {
  dispatch: ObserverDispatch,
  catalog: Catalog,
}

class UrlStateAdapter extends Component<Props> {
  private updates: any[] | null

  constructor(props: Readonly<Props> | Props) {
    super(props)
    this.loadHash.bind(this)
    this.updateHash.bind(this)
    this.updates = null
  }

  componentDidMount() {
    this.loadHash()
  }

  render() {
    if (this.updates) {
      const dispatch = this.props.dispatch
      const updates = this.updates
      setTimeout(() => {
        batch(() => updates.forEach(dispatch))
        this.updates = null
      }, 0)
    }

    if (this.props.currentLon && this.props.currentLat) {
      this.updateHash(this.props)
    }

    return null
  }

  loadHash() {
    this.updates = []    
    if (window.location.hash != '') {
      const parsed = parseHash(window.location.hash)
      this.updates.push({type: ObserverActions.SITE_SELECTED, payload: parsed.site})
      this.updates.push({type: ObserverActions.PRODUCT_SELECTED, payload: parsed.product})
      this.updates.push({type: ObserverActions.FLAVOR_SELECTED, payload: parsed.flavor})
      this.updates.push({type: ObserverActions.FLAVOR_SELECTED, payload: parsed.flavor})

      const animationRunning = parsed.animationRunning == 'true' ? true : false
      if (this.props.animationRunning != animationRunning) {
        this.updates.push({type: ObserverActions.TOGGLE_ANIMATION})
      }

      const [lon, lat] = [parseFloat(parsed.lon), parseFloat(parsed.lat)]
      if (!isNaN(lon) && !isNaN(lat)) {
        this.updates.push({type: ObserverActions.MAP_CENTER_CHANGED, payload: {lon: lon, lat: lat}})
      } else {
        this.updates.push({type: ObserverActions.MAKE_CURRENT_SITE_INTENDED})
      }
    }
  }

  updateHash(state: UrlState) {
    const hash = makeHashFromState(state)
    if (hash != window.location.hash) {
      let hashLess = window.location.href
      if (window.location.href.includes('#')) {
        hashLess = window.location.href.split('#')[0]
      }
      window.history.pushState(null, null, hashLess + hash)
    }
  }
}

const mapStateToProps = (state: State): Props => {
  return {
    catalog: state.catalog,
    siteId: state.selection.siteId,
    productId: state.selection.productId,
    flavorId: state.selection.flavorId,
    animationRunning: state.animation.running,
    currentLon: state.map.current.centerLon,
    currentLat: state.map.current.centerLat
  } as Props
}
export default connect(mapStateToProps)(UrlStateAdapter)
