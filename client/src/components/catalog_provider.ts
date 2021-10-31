import { Component, Dispatch } from 'react'

import { httpGetPromise } from '../utils'
import { ObserverActions } from '../constants'

type Props = { dispatch: Dispatch<{ type: string, payload: unknown }>, url: string }

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
      httpGetPromise(url, false)
        .then(JSON.parse)
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
