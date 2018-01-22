import React from "react"
import Draggable from 'react-draggable'


export class ColorScale extends React.Component {
  render() {
    return (
      <Draggable grid={[25, 25]}>
        <div style={{"background-color": "#c0c0c0", padding: "10px", "z-index": 100, position: "absolute", top: 150, left: 25}}>
          {this.props.name}<br/>
	  foo
          bar
        </div>
      </Draggable>
    )
  }
}
