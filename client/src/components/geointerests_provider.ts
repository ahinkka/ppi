import { Component } from 'react'

import { ObserverActions, ObserverDispatch } from '../constants'

type Props = { dispatch: ObserverDispatch, url: string }

class GeoInterestsProvider extends Component<Props> {
  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    fetch(url)
      .then((response) => response.json())
      .then((obj) => {
        dispatch({ type: ObserverActions.GEOINTERESTS_UPDATED, payload: obj })
      })
  }

  render() {
    return null
  }
}


export default GeoInterestsProvider
