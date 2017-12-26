import React from "react"
import {OverlayTrigger, Tooltip} from "react-bootstrap";


class Tick extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.props.dispatch({type: this.props.action, payload: this.props.payload})
  }

  render() {
    let color = "#ffffff"
    if (this.props.active == true) {
      color = "#000000"
    } else if (this.props.loaded == true) {
      color = "#c0c0c0"
    }

    const tooltip = (
        <Tooltip id={"tick-" + this.props.position + "-tooltip"}>{this.props.tooltip}</Tooltip>
    )

    return (
        <OverlayTrigger placement="bottom" overlay={tooltip}>
          <div style={{position: "absolute", left: this.props.position * 100 + "%", color: color}}
               onClick={this.onClick}>▎</div>
        </OverlayTrigger>
    )
  }
}


export class ProductSlider extends React.Component {
  render() {

    return (
        <div className="progress">
        <Tick position={0.1} loaded={true} active={true} tooltip="foo" />
        <Tick position={0.2} loaded={true} active={false} tooltip="bar" />
        <Tick position={0.5} loaded={true} active={false} />
        <Tick position={0.9} loaded={false} active={false} />
        </div>
      )
  }
}
