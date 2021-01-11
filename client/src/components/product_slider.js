import React from 'react'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'

import moment from 'moment'
import LRU from 'lru-cache'

import {ObserverActions} from '../constants'


const minAnimationTime = (times) => {
  if (times.length == 0) {
    return null
  }

  // Only time - 5 minutes
  if (times.length == 1) {
    return new Date(times[0] - 5 * 60 * 1000)
  }
  return new Date(times[0] - (times[0] - times[1]))
}


const maxAnimationTime = (times) => {
  if (times.length == 0) {
    return null
  }

  // Only time + 5 minutes
  if (times.length == 1) {
    return new Date(times[0] + 5 * 60 * 1000)
  }

  const secondToLastTime = times[times.length - 2]
  const lastTime = times[times.length - 1]
  return new Date(lastTime + (lastTime - secondToLastTime))
}


class Tick extends React.Component {
  shouldComponentUpdate(nextProps) {
    return (
      this.props.position !== nextProps.position ||
	this.props.tooltip !== nextProps.tooltip ||
	this.props.color !== nextProps.color ||
	this.props.character !== nextProps.character
    )
  }

  render() {
    const props = this.props

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
}


const _renderTooltip = (time) => {
  const utcTime = moment.utc(time)
  const minutes = moment.duration(moment(new Date()).diff(utcTime)).asMinutes()
  const displayHours = Math.floor(minutes / 60)
  const displayMinutes = Math.floor(minutes - displayHours * 60)
  return utcTime.format('YYYY-MM-DD HH:mm:ss') + `UTC (${displayHours} hours, ${displayMinutes} minutes ago)`
}


const _renderTooltipCache = new LRU({
  max: 50,
  maxAge: 1000 * 60,
  stale: false,
})
const renderTooltip = (time) => {
  const tooltip = _renderTooltipCache.get(time)
  if (tooltip) {
    return tooltip
  }

  const computed = _renderTooltip(time)
  _renderTooltipCache.set(time, computed)
  return computed
}



function ProductSlider(props) {
  const times = props.ticks.map((item) => item.time)
  const [minTime, maxTime] = [minAnimationTime(times), maxAnimationTime(times)]
  const span = maxTime - minTime

  const ticks = props.ticks.map((item) => {
    const fromStart = item.time - minTime
    const position = fromStart / span

    let character = '▏'
    let color = '#e0e0e0'

    if (item.isCurrent) {
      color = '#000000'
      character = '▎'
    } else if (item.isLoaded) {
      color = '#808080'
    }

    return (<Tick key={item.key} position={position} color={color}
      character={character} tooltip={renderTooltip(item.time)} clicked={item.callback} />)
  })

  const onWheel = (event) => {
    if (event.deltaY < 0) {
      props.dispatch({type: ObserverActions.TICK_BACKWARD})
    } else if (event.deltaY > 0) {
      props.dispatch({type: ObserverActions.TICK_FORWARD})
    }
  }

  return (
    <div className='time-slider' onWheel={onWheel}>
      <div className='time-slider__line'>
        <hr></hr>
      </div>
      <div className='time-slider__ticks'>
        { ticks }
      </div>
    </div>
  )
}


export default ProductSlider
