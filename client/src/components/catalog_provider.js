import { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'

import { httpGetPromise } from '../utils'
import { ObserverActions } from '../constants'


class CatalogProvider extends Component {
  static propTypes = {
    dispatch: PropTypes.func,
    url: PropTypes.string
  }

  constructor() {
    super()

    this.intervalId = null
  }

  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    const update = () => {
      httpGetPromise(url)
	.then(JSON.parse)
	.then((obj) => {
	  dispatch({type: ObserverActions.CATALOG_UPDATED, payload: obj})

	  // TODO XXX:
	  // if (!loadHashState()) {
	  //   store.dispatch({type: ObserverActions.MAKE_CURRENT_SITE_INTENDED})
	  // }	
	})
    }
    
    this.intervalId = setInterval(update, 30000)
    setTimeout(update, 0)
  }

  componentWillUnmount() {
    clearInterval(this.intervalId)
  }

  render() {
    return null
  }
}


export default CatalogProvider
