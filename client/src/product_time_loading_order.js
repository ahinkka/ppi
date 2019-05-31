import * as R from 'ramda'
import moment from 'moment'

const descendingTimeComparator = (a, b) => a.valueOf() < b.valueOf() ? 1 : -1

const indexedFilter = R.addIndex(R.filter)
export const evenIndexed = indexedFilter((n, idx) => idx % 2 == 0)
export const everyFourthIndexed = indexedFilter((n, idx) => idx % 4 == 0)

export const orderForLoading = (times) => {
  const descOrdered = R.sort(descendingTimeComparator, times)

  if (descOrdered.length < 5) {
    return descOrdered
  }

  const maxTime = descOrdered[0]
  const threeHourCutoff = maxTime.valueOf() - 3 * 60 * 60 * 1000
  const twelveHourCutoff = maxTime.valueOf() - 12 * 60 * 60 * 1000

  const maxThreeHourOlds = R.filter((t) => t.valueOf() >= threeHourCutoff, descOrdered)
  const threeToTwelveHourOlds = R.filter(
    (t) => t.valueOf() < threeHourCutoff && t.valueOf() >= twelveHourCutoff,
    descOrdered)
  const olderThanTwelveHours = R.filter((t) => t.valueOf() < twelveHourCutoff, descOrdered)

  const priorityTimes = R.concat(
    R.concat(
      maxThreeHourOlds,
      evenIndexed(threeToTwelveHourOlds)),
    everyFourthIndexed(olderThanTwelveHours))

  const restTimes = R.without(priorityTimes, descOrdered)
  return R.concat(priorityTimes, restTimes)
}
