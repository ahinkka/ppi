import React, { Component, WheelEvent } from 'react'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'

import moment from 'moment'
import LRU from 'lru-cache'

import { ObserverActions, ObserverDispatch } from '../constants'


const minAnimationTime = (times: number[]): Date => {
  if (times.length == 0) {
    return null
  }

  // Only time - 5 minutes
  if (times.length == 1) {
    return new Date(times[0] - 5 * 60 * 1000)
  }
  return new Date(times[0] - (times[0] - times[1]))
}

const maxAnimationTime = (times: number[]): Date => {
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

type TickProps = {
  key: string,
  clicked: () => any,
  position: number,
  tooltip: string,
  color: string,
  character: string,
}

class Tick extends Component<TickProps> {
  shouldComponentUpdate(nextProps: Readonly<TickProps> | TickProps) {
    return (
      this.props.position !== nextProps.position ||
	this.props.tooltip !== nextProps.tooltip ||
	this.props.color !== nextProps.color ||
	this.props.character !== nextProps.character
    )
  }

  render() {
    const { clicked, position, tooltip, color, character } = this.props

    const tooltipComponent = (
      <Tooltip id={'tick-' + position + '-tooltip'}>{tooltip}</Tooltip>
    )

    return (
      <OverlayTrigger placement="bottom" overlay={tooltipComponent}>
        <div style={{position: 'absolute', left: (0.01 + 0.98 * position) * 100 + '%',
          color: color, cursor: 'pointer'}}
        onClick={clicked}>{character}</div>
      </OverlayTrigger>
    )
  }
}

const _renderTooltip = (time: number) => {
  const utcTime = moment.utc(time)
  const minutes = moment.duration(moment(new Date()).diff(utcTime)).asMinutes()
  const displayHours = Math.floor(minutes / 60)
  const displayMinutes = Math.floor(minutes - displayHours * 60)
  return utcTime.format('YYYY-MM-DD HH:mm:ss') + `UTC (${displayHours} hours, ${displayMinutes} minutes ago)`
}

const _renderTooltipCache = new LRU<number, string>({
  max: 50,
  maxAge: 1000 * 60,
  stale: false,
})
const renderTooltip = (time: number) => {
  const tooltip = _renderTooltipCache.get(time)
  if (tooltip) {
    return tooltip
  }

  const computed = _renderTooltip(time)
  _renderTooltipCache.set(time, computed)
  return computed
}

type TickItem = {
  time: number,
  callback: () => any,
  isCurrent: boolean,
  isLoaded: boolean,
  key: string
}

type ProductSliderProps = {
  ticks: TickItem[]
  dispatch: ObserverDispatch
}

function ProductSlider(props: ProductSliderProps) {
  const times = props.ticks.map((item) => item.time)
  const [minTime, maxTime] = [minAnimationTime(times), maxAnimationTime(times)]
  const span = maxTime.valueOf() - minTime.valueOf()

  const ticks = props.ticks.map((item: TickItem) => {
    const fromStart = item.time - minTime.valueOf()
    const tickPosition = fromStart / span

    let character = '▏'
    let color = '#e0e0e0'

    if (item.isCurrent) {
      color = '#000000'
      character = '▎'
    } else if (item.isLoaded) {
      color = '#808080'
    }

    return (<Tick key={item.key} position={tickPosition} color={color} character={character} tooltip={renderTooltip(item.time)} clicked={item.callback} />)
  })

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.deltaY < 0) {
      props.dispatch({ type: ObserverActions.TICK_BACKWARD })
    } else if (event.deltaY > 0) {
      props.dispatch({ type: ObserverActions.TICK_FORWARD })
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
