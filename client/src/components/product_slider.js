import React from 'react'
import {OverlayTrigger, Tooltip} from 'react-bootstrap';
import {ObserverActions} from '../constants'


const Tick = (props) => {
  const tooltip = (
    <Tooltip id={'tick-' + props.position + '-tooltip'}>{props.tooltip}</Tooltip>
  )

  return (
    <OverlayTrigger placement="bottom" overlay={tooltip}>
      <div style={{position: 'absolute', left: (0.01 + 0.98 * props.position) * 100 + '%',
		   color: props.color, cursor: 'pointer'}}
           onClick={props.clicked}>{props.character}</div>
    </OverlayTrigger>
  )
}


export class ProductSlider extends React.Component {
  constructor(props) {
    super(props);

    this.onWheel = this.onWheel.bind(this);
    // this.initializeKeyboardListener = this.initializeKeyboardListener.bind(this);
    // this.removeKeyboardListener = this.removeKeyboardListener.bind(this);
  }

  onWheel(event) {
    if (event.deltaY < 0) {
      this.props.dispatch({type: ObserverActions.TICK_BACKWARD})
    } else if (event.deltaY > 0) {
      this.props.dispatch({type: ObserverActions.TICK_FORWARD})
    }
  }

  render() {
    const tmp = this
    const ticks = this.props.ticks.map(function(item) {
      return (
        <Tick key={item.key} position={item.position} color={item.color}
              character={item.character} tooltip={item.tooltip} clicked={item.clicked} />
      )
    })

    return (
      <div ref={this.containerRef} className='time-slider' onWheel={this.onWheel}>
        <div className='time-slider__line'>
          <hr></hr>
        </div>
        <div className='time-slider__ticks'>
          { ticks }
        </div>
      </div>
    )
  }
}
