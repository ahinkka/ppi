import { catalogUpdatedReducer, reduceValidAnimationTime, selectFlavorTime, animationTickReducer } from '../src/state_reduction'

const times = ['2019-04-19T18:10:00+00:00', '2019-04-19T19:10:00+00:00',
  '2019-04-19T20:10:00+00:00', '2019-04-19T21:10:00+00:00',
  '2019-04-19T22:10:00+00:00', '2019-04-19T23:10:00+00:00']


describe('Selects correct animation time', () => {
  const flavor = { times: times.map((t) => { return {time: t} }) }
  const dates = times.map((t) => Date.parse(t))

  test('if no current time', () => {
    expect(selectFlavorTime(flavor, null, false)).toEqual(dates[dates.length - 1])
  })

  test('when animating', () => {
    expect(selectFlavorTime(flavor, dates[0], true)).toEqual(dates[1])
    expect(selectFlavorTime(flavor, dates[1], true)).toEqual(dates[2])
    expect(selectFlavorTime(flavor, dates[2], true)).toEqual(dates[3])
  })

  test('when animating from last time', () => {
    expect(selectFlavorTime(flavor, dates[5], true)).toEqual(dates[0])
  })
})


describe('On catalog update', () => {
  const timesBefore = times.slice(0, 3)
  const timesAfter = times.slice(1, 4)

  const datesBefore = timesBefore.map((t) => Date.parse(t))
  const datesAfter = timesAfter.map((t) => Date.parse(t))

  const flavorBefore = { times: timesBefore.map((t) => { return {time: t} }) }
  const before = {
    catalog: { radarProducts: { vantaa: { products: { dbzh: { flavors: { '0.5': flavorBefore }}}}}},
    selection: { flavor: flavorBefore },
    animation: { currentProductTime: datesBefore[3] }}

  const flavorAfter = { times: timesAfter.map((t) => { return {time: t} }) }
  const after = {
    catalog: { radarProducts: { vantaa: { products: { dbzh: { flavors: { '0.5': flavorAfter }}}}}},
    selection: { flavor: flavorAfter }}

  test('keep the same time as before', () => {
    const state = Object.assign({}, after, { animation: { currentProductTime: datesBefore[1] }})
    const reduced = reduceValidAnimationTime(state)

    expect(reduced.animation.currentProductTime).toEqual(datesAfter[0])
    expect(reduced.animation.currentProductTime).toEqual(state.animation.currentProductTime)
  })

  test('select new last time if current time is last', () => {
    const state = Object.assign({}, before, { animation: { currentProductTime: datesBefore[2] }})
    const reduced = catalogUpdatedReducer(state, { payload: after.catalog })

    expect(reduced.animation.currentProductTime).not.toEqual(state.animation.currentProductTime)
    expect(reduced.animation.currentProductTime).toBeGreaterThan(state.animation.currentProductTime)
    expect(reduced.animation.currentProductTime).toEqual(datesAfter[2])
  })

  test("select last time if current time isn't available", () => {
    const state = Object.assign({}, after, { animation: { currentProductTime: datesBefore[0] }})
    const reduced = reduceValidAnimationTime(after)
    expect(reduced.animation.currentProductTime).toEqual(datesAfter[2])
  })
})
