import { reducer } from '../src/state'
import { Action } from '../src/action'

describe('Cursor Tool Reducer', () => {
  test('toggle cursor tool', () => {
    const initialState = reducer(undefined, { type: 'prime' })
    expect(initialState.cursorTool.active).toBe(false)

    const toggledState = reducer(initialState, { type: 'toggle cursor tool' })
    expect(toggledState.cursorTool.active).toBe(true)

    const toggledAgainState = reducer(toggledState, { type: 'toggle cursor tool' })
    expect(toggledAgainState.cursorTool.active).toBe(false)
  })

  test('add cursor tool point', () => {
    const initialState = reducer(undefined, { type: 'prime' })
    expect(initialState.cursorTool.points).toHaveLength(0)

    const timestamp = Date.now()
    const coordinates: [number, number] = [24.94, 60.17] // Helsinki coordinates

    const action: Action = {
      type: 'cursor tool point added',
      payload: { timestamp, coordinates }
    }

    const newState = reducer(initialState, action)
    expect(newState.cursorTool.points).toHaveLength(1)
    expect(newState.cursorTool.points[0].timestamp).toBe(timestamp)
    expect(newState.cursorTool.points[0].coordinates).toEqual(coordinates)
  })

  test('reset cursor tool', () => {
    const initialState = reducer(undefined, { type: 'prime' })

    // Add a point first
    const timestamp = Date.now()
    const coordinates: [number, number] = [24.94, 60.17]
    const addAction: Action = {
      type: 'cursor tool point added',
      payload: { timestamp, coordinates }
    }
    const stateWithPoint = reducer(initialState, addAction)
    expect(stateWithPoint.cursorTool.points).toHaveLength(1)

    // Reset
    const resetAction: Action = { type: 'cursor tool reset' }
    const resetState = reducer(stateWithPoint, resetAction)
    expect(resetState.cursorTool.points).toHaveLength(0)
  })

  test('multiple cursor tool points', () => {
    const initialState = reducer(undefined, { type: 'prime' })

    const point1: Action = {
      type: 'cursor tool point added',
      payload: { timestamp: 1000, coordinates: [24.94, 60.17] }
    }

    const point2: Action = {
      type: 'cursor tool point added',
      payload: { timestamp: 2000, coordinates: [25.0, 60.2] }
    }

    const state1 = reducer(initialState, point1)
    const state2 = reducer(state1, point2)

    expect(state2.cursorTool.points).toHaveLength(2)
    expect(state2.cursorTool.points[0].timestamp).toBe(1000)
    expect(state2.cursorTool.points[1].timestamp).toBe(2000)
  })

  test('cursor tool extrapolation', () => {
    const initialState = reducer(undefined, { type: 'prime' })

    // Add two points - extrapolation should happen automatically when the second point is added
    const point1: Action = {
      type: 'cursor tool point added',
      payload: { timestamp: 1000, coordinates: [24.94, 60.17] }
    }

    const point2: Action = {
      type: 'cursor tool point added',
      payload: { timestamp: 2000, coordinates: [25.0, 60.2] }
    }

    const stateWithExtrapolation = reducer(reducer(initialState, point1), point2)

    // Verify that extrapolation happened automatically when second point was added
    expect(stateWithExtrapolation.cursorTool.extrapolatedPoints).toHaveLength(1)

    // Verify the extrapolated point is calculated correctly
    const extrapolatedPoint = stateWithExtrapolation.cursorTool.extrapolatedPoints[0]

    // Time difference between points: 1000 minutes (from 1000 to 2000 timestamp)
    // Movement: [0.06 lon, 0.03 lat] over 1000 minutes
    // Extrapolated position should be at [25.06, 60.23] (adding same movement again)

    expect(extrapolatedPoint.coordinates[0]).toBeCloseTo(25.06, 2)
    expect(extrapolatedPoint.coordinates[1]).toBeCloseTo(60.23, 2)
    expect(extrapolatedPoint.timestamp).toBeGreaterThan(2000)
  })
})
