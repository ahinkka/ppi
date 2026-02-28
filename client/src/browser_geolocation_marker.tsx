import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux_hooks'
import { Feature } from 'ol'
import { Point } from 'ol/geom'
import { Style, Circle, Fill, Stroke } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import OlMap from 'ol/Map'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'

export const BrowserGeolocationMarker: React.FC<{ map: OlMap | null }> = ({ map }) => {
  const dispatch = useAppDispatch()
  const browserGeolocation = useAppSelector((state) => state.browserGeolocation)
  const { enabled, position, accuracy } = browserGeolocation

  useEffect(() => {
    let watchId: number | null = null

    if (enabled && position === null) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const coords = [pos.coords.longitude, pos.coords.latitude] as [number, number]
            dispatch({
              type: 'browser geolocation position updated',
              payload: {
                position: coords,
                accuracy: pos.coords.accuracy
              }
            })
          },
          (error) => {
            let errorMessage = 'Unknown geolocation error'
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Geolocation permission denied'
                break
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Position unavailable'
                break
              case error.TIMEOUT:
                errorMessage = 'Geolocation timeout'
                break
            }
            dispatch({
              type: 'browser geolocation error',
              payload: errorMessage
            })
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        )
      } else {
        dispatch({
          type: 'browser geolocation error',
          payload: 'Geolocation not supported by this browser'
        })
      }
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [enabled, position, dispatch])

  useEffect(() => {
    if (!enabled || !position || !map) {
      return () => {}
    }

    const markerFeature = new Feature({
      geometry: new Point(fromLonLat(position))
    })

    // Determine marker color based on accuracy
    const isLowAccuracy = accuracy !== null && accuracy > 1000 // 1km threshold
    const markerColor = isLowAccuracy ? 'rgba(255, 165, 0, 0.4)' : 'rgba(255, 0, 0, 0.8)'
    const markerStrokeColor = isLowAccuracy ? 'rgba(255, 215, 0, 0.6)' : 'white'

    // Style for the position marker
    markerFeature.setStyle(new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: markerColor }),
        stroke: new Stroke({ color: markerStrokeColor, width: 2 })
      })
    }))

    const vectorSource = new VectorSource({
      features: [markerFeature]
    })

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 1000
    })

    map.addLayer(vectorLayer)

    return () => {
      map.removeLayer(vectorLayer)
    }
  }, [enabled, position, accuracy, map])

  return null
}
