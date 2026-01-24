import {OverlayTrigger, Tooltip} from 'react-bootstrap'
import { ObserverActions, ObserverDispatch } from '../constants'

type Props = {
  tooltip: string,
  onSymbol: string,
  offSymbol: string,
  toggleStatus: boolean,
  action: ObserverActions,
  dispatch: ObserverDispatch
}

export function ToggleButton(props: Props) {
  const tooltip = (
    <Tooltip id="pause-tooltip">{props.tooltip}</Tooltip>
  )

  if (props.toggleStatus == false) {
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button type="button" className="btn btn-primary"
          data-bs-toggle="button" aria-pressed="false"
          onClick={() => props.dispatch({type: props.action})}>{props.offSymbol}
        </button>
      </OverlayTrigger>
    )
  } else {
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button type="button" className="btn btn-primary active"
          data-bs-toggle="button" aria-pressed="true"
          onClick={() => props.dispatch({type: props.action})}>{props.onSymbol}
        </button>
      </OverlayTrigger>
    )
  }
}
