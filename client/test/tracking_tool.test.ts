import { reducer } from '../src/state'
import { Action } from '../src/action'

describe('Tracking Tool Reducer', () => {
  test('toggle tracking tool', () => {
    const initialState = reducer(undefined, { type: 'prime' })
    expect(initialState.trackingTool.active).toBe(false)

    const toggledState = reducer(initialState, { type: 'toggle tracking tool' })
    expect(toggledState.trackingTool.active).toBe(true)

    const toggledAgainState = reducer(toggledState, { type: 'toggle tracking tool' })
    expect(toggledAgainState.trackingTool.active).toBe(false)
  })

  test('add tracking tool point', () => {
    const initialState = reducer(undefined, { type: 'prime' })
    expect(initialState.trackingTool.points).toHaveLength(0)

    const timestamp = Date.now()
    const coordinates: [number, number] = [24.94, 60.17] // Helsinki coordinates

    const action: Action = {
      type: 'tracking tool point added',
      payload: { timestamp, coordinates }
    }

    const newState = reducer(initialState, action)
    expect(newState.trackingTool.points).toHaveLength(1)
    expect(newState.trackingTool.points[0].timestamp).toBe(timestamp)
    expect(newState.trackingTool.points[0].coordinates).toEqual(coordinates)
  })

  test('reset tracking tool', () => {
    const initialState = reducer(undefined, { type: 'prime' })

    // Add a point first
    const timestamp = Date.now()
    const coordinates: [number, number] = [24.94, 60.17]
    const addAction: Action = {
      type: 'tracking tool point added',
      payload: { timestamp, coordinates }
    }
    const stateWithPoint = reducer(initialState, addAction)
    expect(stateWithPoint.trackingTool.points).toHaveLength(1)

    // Reset
    const resetAction: Action = { type: 'tracking tool reset' }
    const resetState = reducer(stateWithPoint, resetAction)
    expect(resetState.trackingTool.points).toHaveLength(0)
  })

  test('multiple tracking tool points', () => {
    const initialState = reducer(undefined, { type: 'prime' })

    const point1: Action = {
      type: 'tracking tool point added',
      payload: { timestamp: 1000, coordinates: [24.94, 60.17] }
    }

    const point2: Action = {
      type: 'tracking tool point added',
      payload: { timestamp: 2000, coordinates: [25.0, 60.2] }
    }

    const state1 = reducer(initialState, point1)
    const state2 = reducer(state1, point2)

    expect(state2.trackingTool.points).toHaveLength(2)
    expect(state2.trackingTool.points[0].timestamp).toBe(1000)
    expect(state2.trackingTool.points[1].timestamp).toBe(2000)
  })

  test('tracking tool extrapolation', () => {
    const initialState = reducer(undefined, { type: 'prime' })

    // Add two points - extrapolation should happen automatically when the second point is added
    const point1: Action = {
      type: 'tracking tool point added',
      payload: { timestamp: 1000, coordinates: [24.94, 60.17] }
    }

    const point2: Action = {
      type: 'tracking tool point added',
      payload: { timestamp: 2000, coordinates: [25.0, 60.2] }
    }

    const stateWithExtrapolation = reducer(reducer(initialState, point1), point2)

    // Verify that extrapolation happened automatically when second point was added
    expect(stateWithExtrapolation.trackingTool.extrapolatedPoints).toHaveLength(1)

    // Verify the extrapolated point is calculated correctly
    const extrapolatedPoint = stateWithExtrapolation.trackingTool.extrapolatedPoints[0]

    // Time difference between points: 1000 minutes (from 1000 to 2000 timestamp)
    // Movement: [0.06 lon, 0.03 lat] over 1000 minutes
    // Extrapolated position should be at [25.06, 60.23] (adding same movement again)

    expect(extrapolatedPoint.coordinates[0]).toBeCloseTo(25.06, 2)
    expect(extrapolatedPoint.coordinates[1]).toBeCloseTo(60.23, 2)
    expect(extrapolatedPoint.timestamp).toBeGreaterThan(2000)
  })
})
