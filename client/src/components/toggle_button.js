import React from 'react'
import {OverlayTrigger, Tooltip} from 'react-bootstrap';


export default function(props) {
  const tooltip = (
    <Tooltip id="pause-tooltip">{props.tooltip}</Tooltip>
  )

  if (props.toggleStatus == false) {
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button type="button" className="btn btn-primary"
          data-toggle="button" aria-pressed="false"
          onClick={() => props.dispatch({type: props.action})}>{props.offSymbol}
        </button>
      </OverlayTrigger>
    )
  } else {
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button type="button" className="btn btn-primary active"
          data-toggle="button" aria-pressed="true"
          onClick={() => props.dispatch({type: props.action})}>{props.onSymbol}
        </button>
      </OverlayTrigger>
    )
  }
}
