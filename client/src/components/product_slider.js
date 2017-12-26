import React from "react"
import {OverlayTrigger, Tooltip} from "react-bootstrap";


class Tick extends React.Component {
  render() {
    let color = "#ffffff"
    if (this.props.active == true) {
      color = "#000000"
    } else if (this.props.loaded == true) {
      color = "#c0c0c0"
    }
    
    return (
        <div style={{position: "absolute", left: this.props.position * 100 + "%", color: color}}>▎</div>
    )
  }
}


export class ProductSlider extends React.Component {
  render() {

    return (
	<div className="progress">
  	<Tick position={0.1} loaded={true} active={true} />
	<Tick position={0.2} loaded={true} active={false} />
	<Tick position={0.5} loaded={true} active={false} />
	<Tick position={0.9} loaded={false} active={false} />
	</div>
      )
  }
}
