import { Component, Dispatch } from 'react'

import { httpGetPromise } from '../utils'
import { ObserverActions } from '../constants'

type Props = { dispatch: Dispatch<{ type: string, payload: unknown }>, url: string }

class GeoInterestsProvider extends Component<Props> {
  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    httpGetPromise(url, false)
      .then(JSON.parse)
      .then((obj) => {
        dispatch({ type: ObserverActions.GEOINTERESTS_UPDATED, payload: obj })
      })
  }

  render() {
    return null
  }
}


export default GeoInterestsProvider
