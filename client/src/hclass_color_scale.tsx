import React from 'react'
import Draggable from 'react-draggable'

import { HclassColors, RGBAColor } from './coloring'


function ColorEntry(props: { color: RGBAColor, label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <div style={{ width: '5em', fontSize: '0.8em', textAlign: 'center', paddingRight: '0.3em' }}>{props.label.replace('_', ' ')}</div>
      <div style={{ width: '2em', backgroundColor: 'rgba(' + props.color.join(', ') + ')' }}></div>
    </div>
  )
}


const MemoizedColorScale = React.memo(function HclassColorScale() {
  const nodeRef = React.useRef<HTMLDivElement>(null)

  const items = Object.entries(HclassColors).map(function([label, color]) {
    return (
      <ColorEntry key={'entry-' + label}
        color={color}
        label={label} />
    )
  })

  // TODO: use non-px units everywhere
  return (
    <Draggable nodeRef={nodeRef} grid={[25, 25]}>
      <div ref={nodeRef} style={{
        backgroundColor: '#c0c0c0', padding: '10px',
        zIndex: 100, position: 'absolute', top: 150, left: 25
      }}>
        <div style={{ width: '7em', fontSize: '0.9em' }}>hclass</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items}
        </div>
      </div>
    </Draggable>
  )
})


export default MemoizedColorScale
