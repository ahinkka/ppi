import { Component } from 'react'

import { ObserverActions, ObserverDispatch } from '../constants'

type Props = { dispatch: ObserverDispatch, url: string }

class CatalogProvider extends Component<Props> {
  private intervalId: number | null
  private initialTimeoutId: number | null

  constructor(props: Readonly<Props> | Props) {
    super(props)
    this.intervalId = null
    this.initialTimeoutId = null
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

    this.intervalId = window.setInterval(update, 30000)
    this.initialTimeoutId = window.setTimeout(update, 0)
  }

  componentWillUnmount() {
    if (this.intervalId) window.clearInterval(this.intervalId)
    if (this.initialTimeoutId) window.clearTimeout(this.initialTimeoutId)
  }

  render() {
    return null
  }
}


export default CatalogProvider
