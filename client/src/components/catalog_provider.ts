import { Component } from 'react'

import { ObserverActions, ObserverDispatch } from '../constants'

type Props = { dispatch: ObserverDispatch, url: string }

class CatalogProvider extends Component<Props> {
  private intervalId: ReturnType<typeof setInterval> | null

  constructor(props: Readonly<Props> | Props) {
    super(props)
    this.intervalId = null
  }

  componentDidMount() {
    const dispatch = this.props.dispatch
    const url = this.props.url

    const update = () => {
      fetch(url)
        .then((response) => response.json())
        .then((obj) => {
          dispatch({ type: ObserverActions.CATALOG_UPDATED, payload: obj })
        })
    }

    this.intervalId = setInterval(update, 30000)
    setTimeout(update, 0)
  }

  componentWillUnmount() {
    if (this.intervalId) clearInterval(this.intervalId)
  }

  render() {
    return null
  }
}


export default CatalogProvider
