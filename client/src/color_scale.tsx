import React from 'react'
import Draggable from 'react-draggable'

import { ScaleRangeType, RangeBoundary, RGBColor, ScaleRange } from './coloring'

type SolidColorRangeProps = {
  color: RGBColor;
  start: RangeBoundary;
  end: RangeBoundary;
}

type ColorScaleProps = {
  name?: string;
  type: string;
  unit: string;
  ranges: ScaleRange[];
}

function SolidColorRange(props: SolidColorRangeProps) {
  // TODO: handle open ranges
  return (
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <div style={{width: '5em', fontSize: '0.8em', textAlign: 'center',
        paddingRight: '0.2em'}}>{props.start.value} &ndash; {props.end.value}</div>
      <div style={{width: '2em',
        backgroundColor: 'rgb(' + props.color.join(', ') + ')'}}></div>
    </div>
  )
}


const MemoizedColorScale = React.memo(function ColorScale(props: ColorScaleProps) {
  const nodeRef = React.useRef<HTMLDivElement>(null)
  // -type: ScaleRangeType.STEP
  // -color [r,g,b]
  // -start
  //  -open: t/f
  //  -value: value
  // -end
  //  -open: t/f
  //  -value: value

  const tmp = props.ranges.slice(0)
  tmp.reverse()
  const ranges = tmp.map(function(item) {
    if (item.type !== ScaleRangeType.STEP) {
      throw new Error('Unhandled step type: ' + item.type)
    }

    return (
      <SolidColorRange key={'range-' + item.start.value}
        color={item.color}
        start={item.start}
        end={item.end} />
    )
  })

  // TODO: use non-px units everywhere
  // <div style={{width: '7em'}}>{props.name}</div><br/>
  return (
    <Draggable nodeRef={nodeRef} grid={[25, 25]}>
      <div ref={nodeRef} style={{
        backgroundColor: '#c0c0c0', padding: '10px',
        zIndex: 100, position: 'absolute', top: 150, left: 25
      }}>
        <div style={{ width: '7em', fontSize: '0.9em' }}>{props.type}, {props.unit}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ranges}
        </div>
      </div>
    </Draggable>
  )
})


export default MemoizedColorScale
