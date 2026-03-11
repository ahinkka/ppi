import { useAppDispatch } from './redux_hooks'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Action } from './action'

type Props<T extends Action> = {
  text: string,
  tooltip?: string,
  action: T,
  disabled?: boolean,
  className?: string
}

export function Button<T extends Action>(props: Props<T>) {
  const dispatch = useAppDispatch()

  const handleClick = () => {
    if (!props.disabled) {
      dispatch(props.action)
    }
  }

  const button = (
    <button type="button" className={`btn btn-primary ${props.className || ''}`}
      onClick={handleClick} disabled={props.disabled || false}>
      {props.text}
    </button>
  )

  if (props.tooltip) {
    const tooltip = (
      <Tooltip id="button-tooltip">{props.tooltip}</Tooltip>
    )
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        {button}
      </OverlayTrigger>
    )
  }

  return button
}