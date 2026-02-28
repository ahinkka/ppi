import { useAppDispatch, useAppSelector } from './redux_hooks'
import { useEffect, useRef } from 'react'
import OlMap from 'ol/Map'
import Control from 'ol/control/Control'

export const BrowserGeolocationControl: React.FC<{ map: OlMap | null }> = ({ map }) => {
  const dispatch = useAppDispatch()
  const browserGeolocation = useAppSelector((state) => state.browserGeolocation)
  const controlRef = useRef<HTMLDivElement>(null)
  const olControlRef = useRef<Control>(null)

  useEffect(() => {
    if (!map || !controlRef.current) {
      return () => {}
    }

    const element = controlRef.current
    olControlRef.current = new Control({
      element: element
    })

    map.addControl(olControlRef.current)

    return () => {
      if (olControlRef.current) {
        map.removeControl(olControlRef.current)
      }
    }
  }, [map])

  const handleToggle = () => {
    dispatch({ type: 'toggle browser geolocation' })
  }

  const getButtonClass = () => {
    const baseClass = 'browser-geolocation-control'
    if (browserGeolocation.enabled) {
      return `${baseClass} ${baseClass}--active`
    }
    if (browserGeolocation.error) {
      return `${baseClass} ${baseClass}--error`
    }
    return baseClass
  }

  const getButtonTitle = () => {
    if (browserGeolocation.error) {
      return `Error: ${browserGeolocation.error}`
    }
    if (browserGeolocation.enabled && browserGeolocation.position) {
      return 'Browser geolocation active - click to disable'
    }
    if (browserGeolocation.enabled) {
      return 'Waiting for geolocation...'
    }
    return 'Enable browser geolocation'
  }

  return (
    <div ref={controlRef} className="ol-control browser-geolocation-control-container">
      <button
        className={getButtonClass()}
        onClick={handleToggle}
        title={getButtonTitle()}
        aria-label={getButtonTitle()}
      >
        <span className="browser-geolocation-icon">📍</span>
      </button>
    </div>
  )
}
