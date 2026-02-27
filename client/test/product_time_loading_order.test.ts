import { Temporal } from '@js-temporal/polyfill'
import { orderForLoading, evenIndexed, everyFourthIndexed } from '../src/product_time_loading_order'

describe('Should order more recent products first', () => {
  const startTime = Temporal.Instant.from('2019-04-19T00:00:00+00:00')
  const times = Array.from({ length: 24 * 4 }, (_, i) =>
    startTime.add({ minutes: i * 15 })
  ).map(d => d.epochMilliseconds)
  const sorted = orderForLoading(times)

  const threeHourProductCount = 3 * 4 + 1
  const twelveHourProductCount = threeHourProductCount + 9 * 2

  test('with all products from the last three hours (inclusive) first', () => {
    expect(sorted.slice(0, threeHourProductCount))
      .toEqual([...times.slice(times.length - threeHourProductCount)].reverse())
  })

  test('with every other product from the last 12 hours (inclusive)', () => {
    const twelveToThreeHoursInThePast =
      times.slice(times.length - 12 * 4 - 1, times.length - threeHourProductCount)
    const everyEvenIndexed = evenIndexed([...twelveToThreeHoursInThePast].reverse())
    expect(sorted.slice(threeHourProductCount, threeHourProductCount + 9 * 2)).toEqual(everyEvenIndexed)
  })

  test('with every fourth product after that', () => {
    const startToTwelveHoursInThePast = times.slice(0, times.length - 12 * 4 - 1)
    const everyFourth = everyFourthIndexed([...startToTwelveHoursInThePast].reverse())
    expect(sorted.slice(twelveHourProductCount, twelveHourProductCount + 12)).toEqual(everyFourth)
  })

  test('remaining products in descending order', () => {
    const remaining = [...sorted.slice(twelveHourProductCount + 12, sorted.length - 1)].reverse()
    const result = remaining.reduce<number | boolean>(
      (previousOrFalse: number | boolean, current: number) => {
        if (typeof previousOrFalse === 'boolean') return previousOrFalse
        return previousOrFalse < current ? current : false
      },
      0
    )
    expect(result).toBeTruthy()
  })

  test('all products are included', () => {
    expect(new Set(sorted)).toEqual(new Set(times))
  })
})
