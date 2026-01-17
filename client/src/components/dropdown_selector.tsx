import React from 'react'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'

import { ObserverActions, ObserverDispatch } from '../constants'


type DropdownSelectorOptionProps = {
  id: string,
  display: string
}

const DropdownSelectorOption = (props: DropdownSelectorOptionProps) =>
  (<option key={props.id} value={props.id}>{props.display}</option>)

type DropdownSelectorProps = {
  items: DropdownSelectorOptionProps[]
  tooltipId: string,
  tooltip: string,
  legend: string
  currentValue: string,
  disabled: boolean,
  action: ObserverActions,
  dispatch: ObserverDispatch
}

const DropdownSelector = (props: DropdownSelectorProps) => {
  const options = props.items.map(
    (item) => (<DropdownSelectorOption key={item.id} id={item.id} display={item.display}/>)
  )

  const tooltipId = `${props.legend}-tooltip`
  const tooltip = (
    <Tooltip id={tooltipId}>{props.tooltip}</Tooltip>
  )

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    props.dispatch({ type: props.action, payload: e.target.value })

  const selectTitle = 'Select ' + props.legend.toLowerCase();
  return (
    <div className="dropdown-selector">
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <label className="dropdown-selector__label"
          htmlFor={`${props.legend}-select`}
          title={props.legend}>{props.legend}</label>
      </OverlayTrigger>
      <select id={`${props.legend}-select`} className="form-control dropdown-selector__select"
        value={props.currentValue} onChange={handleChange}
        disabled={props.disabled} title={selectTitle}>
        {options}
      </select>
    </div>
  )
}


export default DropdownSelector
