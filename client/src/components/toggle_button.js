import React from "react"
import {OverlayTrigger, Tooltip} from "react-bootstrap";

import {ObserverActions} from "../constants"


export class ToggleButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.props.dispatch({type: this.props.action})
  }

  render() {
    const tooltip = (
	<Tooltip id="pause-tooltip">{this.props.tooltip}</Tooltip>
    )

    if (this.props.toggleStatus == false) {
      return (
	<OverlayTrigger placement="bottom" overlay={tooltip}>
	  <button type="button" className="btn btn-primary"
	          data-toggle="button" aria-pressed="false"
                  onClick={this.handleChange}>{this.props.offSymbol}</button>
	</OverlayTrigger>
      )
    } else {
      return (
	<OverlayTrigger placement="bottom" overlay={tooltip}>
	  <button type="button" className="btn btn-primary active"
	          data-toggle="button" aria-pressed="true"
                  onClick={this.handleChange}>{this.props.onSymbol}</button>
	</OverlayTrigger>
      )
    }
  }
}
