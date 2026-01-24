import { Component, Dispatch } from 'react'

import { Action } from './action'

type Props = { dispatch: Dispatch<Action>, url: string }

class GeoInterestsProvider extends Component<Props> {
  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    fetch(url)
      .then((response) => response.json())
      .then((obj) => {
        dispatch({ type: 'geointerests updated', payload: obj })
      })
  }

  render(): null {
    return null
  }
}


export default GeoInterestsProvider
