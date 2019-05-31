import * as R from 'ramda'
import moment from 'moment'
import { orderForLoading, evenIndexed, everyFourthIndexed } from '../src/product_time_loading_order'

describe('Should order more recent products first', () => {
  const startTime = moment.utc('2019-04-19T00:00:00+00:00')
  const times = R.map(
    (minutes) => startTime.clone().add(moment.duration(minutes, 'minutes')),
    R.map(R.multiply(15), R.range(0, 24 * 4)))
  const sorted = orderForLoading(times)

  const threeHourProductCount = 3 * 4 + 1
  const twelveHourProductCount = threeHourProductCount + 9 * 2

  test('with all products from the last three hours (inclusive) first', () => {
    expect(sorted.slice(0, threeHourProductCount))
      .toEqual(R.reverse(times.slice(times.length - threeHourProductCount)))
  })

  test('with every other product from the last 12 hours (inclusive)', () => {
    const twelveToThreeHoursInThePast =
      times.slice(times.length - 12 * 4 - 1, times.length - threeHourProductCount)
    const everyEvenIndexed = evenIndexed(R.reverse(twelveToThreeHoursInThePast))
    expect(sorted.slice(threeHourProductCount, threeHourProductCount + 9 * 2)).toEqual(everyEvenIndexed)
  })

  test('with every fourth product after that', () => {
    const startToTwelveHoursInThePast = times.slice(0, times.length - 12 * 4 - 1)
    const everyFourth = everyFourthIndexed(R.reverse(startToTwelveHoursInThePast))
    expect(sorted.slice(twelveHourProductCount, twelveHourProductCount + 12)).toEqual(everyFourth)
  })

  test('remaining products in descending order', () => {
    const remaining = R.reverse(sorted.slice(twelveHourProductCount + 12, sorted.length - 1))
    expect(remaining.reduce(
      (previousOrFalse, current) => previousOrFalse.valueOf() < current.valueOf() ? current : false,
      new Date(0)
    )).toBeTruthy()
  })

  test('all products are included', () => {
    expect(new Set(sorted)).toEqual(new Set(times))
  })
})
