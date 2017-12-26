import React from "react"
import {OverlayTrigger, Tooltip} from "react-bootstrap";


export class ProductSlider extends React.Component {
  render() {
    return (
	<div className="progress">
          <div className="progress-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"
               style={{width: "60%"}}>
            <span className="sr-only">60% Complete</span>
	  </div>
	</div>
      )
  }
}
