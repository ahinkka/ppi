import React from "react"
import Draggable from 'react-draggable'


export class ColorScale extends React.Component {
  render() {
    return (
      <Draggable
        grid={[25, 25]}
        defaultPosition={{x: 25, y: 25}}
        >
        <div style={{"background-color": "#c0c0c0", padding: "10px", "z-index": 100, position: "absolute"}}>foo</div>
      </Draggable>
    )
  }
}
