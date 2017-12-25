import React from "react"
import {OverlayTrigger, Tooltip} from "react-bootstrap";

import {ObserverActions} from "../constants"


export class PlayButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.props.dispatch({type: ObserverActions.TOGGLE_ANIMATION})
  }

  render() {
    const tooltip = (
	<Tooltip id="pause-tooltip">Press SPACE to toggle animation</Tooltip>
    )

    if (this.props.animationRunning == false) {
      return (
	<OverlayTrigger placement="bottom" overlay={tooltip}>
	  <button type="button" className="btn btn-primary"
	          data-toggle="button" aria-pressed="false"
                  onClick={this.handleChange}>&nbsp;&#9658;&nbsp;</button>
	</OverlayTrigger>
      )
    } else {
      return (
	<OverlayTrigger placement="bottom" overlay={tooltip}>
	  <button type="button" className="btn btn-primary active"
	          data-toggle="button" aria-pressed="true"
                  onClick={this.handleChange}>&#9616;&nbsp;&#9612;</button>
	</OverlayTrigger>
      )
    }
  }
}
