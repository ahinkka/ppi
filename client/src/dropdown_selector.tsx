import React from 'react'
import { useAppDispatch } from './redux_hooks'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'

import { StringPayloadAction } from './action'


type DropdownSelectorOptionProps = {
  id: string,
  display: string
}

const DropdownSelectorOption = (props: DropdownSelectorOptionProps) =>
  (<option key={props.id} value={props.id}>{props.display}</option>)

type DropdownSelectorProps<T extends StringPayloadAction['type']> = {
  items: DropdownSelectorOptionProps[]
  tooltipId: string,
  tooltip: string,
  legend: string
  currentValue: string,
  disabled: boolean,
  action: T
}

const DropdownSelector = <T extends StringPayloadAction['type']>(
  props: DropdownSelectorProps<T>
) => {
  const dispatch = useAppDispatch()
  const options = props.items.map(
    (item) => (<DropdownSelectorOption key={item.id} id={item.id} display={item.display}/>)
  )

  const tooltipId = `${props.legend}-tooltip`
  const tooltip = (
    <Tooltip id={tooltipId}>{props.tooltip}</Tooltip>
  )

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    dispatch({
      type: props.action,
      payload: e.target.value
    } as Extract<StringPayloadAction, { type: T }>)

  const selectTitle = 'Select ' + props.legend.toLowerCase()
  return (
    <div className="dropdown-selector">
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <label className="dropdown-selector__label"
          htmlFor={`${props.legend}-select`}
          title={props.legend}>{props.legend}</label>
      </OverlayTrigger>
      <select id={`${props.legend}-select`} className="form-select dropdown-selector__select"
        value={props.currentValue} onChange={handleChange}
        disabled={props.disabled} title={selectTitle}>
        {options}
      </select>
    </div>
  )
}


export default DropdownSelector
