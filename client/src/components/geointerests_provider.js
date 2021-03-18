import { Component } from 'react'
import PropTypes from 'prop-types'

import { httpGetPromise } from '../utils'
import { ObserverActions } from '../constants'


class GeoInterestsProvider extends Component {
  static propTypes = {
    dispatch: PropTypes.func,
    url: PropTypes.string
  }

  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    httpGetPromise(url)
      .then(JSON.parse)
      .then((obj) => {
        dispatch({'type': ObserverActions.GEOINTERESTS_UPDATED, payload: obj})
      })
  }

  render() {
    return null
  }
}


export default GeoInterestsProvider
