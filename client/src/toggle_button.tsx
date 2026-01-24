import {OverlayTrigger, Tooltip} from 'react-bootstrap'
import { NoPayloadAction, ObserverDispatch } from './constants'

type Props<T extends NoPayloadAction['type']> = {
  tooltip: string,
  onSymbol: string,
  offSymbol: string,
  toggleStatus: boolean,
  action: T,
  dispatch: ObserverDispatch
}

export function ToggleButton<T extends NoPayloadAction['type']>(props: Props<T>) {
  const tooltip = (
    <Tooltip id="pause-tooltip">{props.tooltip}</Tooltip>
  )

  const handleClick = () => {
    props.dispatch({ type: props.action } as Extract<NoPayloadAction, { type: T }>)
  }

  if (props.toggleStatus == false) {
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button type="button" className="btn btn-primary"
          data-bs-toggle="button" aria-pressed="false"
          onClick={handleClick}>{props.offSymbol}
        </button>
      </OverlayTrigger>
    )
  } else {
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button type="button" className="btn btn-primary active"
          data-bs-toggle="button" aria-pressed="true"
          onClick={handleClick}>{props.onSymbol}
        </button>
      </OverlayTrigger>
    )
  }
}
