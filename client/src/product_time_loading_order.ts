import { pipe } from 'fp-ts/function'
import { filterWithIndex, flatten, sortBy } from 'fp-ts/Array'
import { Ord as NumberOrd } from 'fp-ts/number'
import { reverse } from 'fp-ts/Ord'

export const evenIndexed = filterWithIndex((idx, _) => idx % 2 == 0)
export const everyFourthIndexed = filterWithIndex((idx, _) => idx % 4 == 0)

const descendingTimeOrd = pipe(
  NumberOrd,
  reverse
)

export const orderForLoading = (times: number[]) => {
  const descOrdered = sortBy([descendingTimeOrd])(times)

  if (descOrdered.length < 5) {
    return descOrdered
  }

  const maxTime = descOrdered[0]
  const threeHourCutoff = maxTime.valueOf() - 3 * 60 * 60 * 1000
  const twelveHourCutoff = maxTime.valueOf() - 12 * 60 * 60 * 1000

  const maxThreeHourOlds = descOrdered.filter(t => t.valueOf() >= threeHourCutoff)
  const threeToTwelveHourOlds = descOrdered.filter(
    t => t.valueOf() < threeHourCutoff && t.valueOf() >= twelveHourCutoff
  )
  const olderThanTwelveHours = descOrdered.filter(t => t.valueOf() < twelveHourCutoff)

  const priorityTimes = flatten([
    maxThreeHourOlds,
    evenIndexed(threeToTwelveHourOlds),
    everyFourthIndexed(olderThanTwelveHours)
  ])

  const restTimes = descOrdered.filter(v => priorityTimes.indexOf(v) < 0)
  return flatten([priorityTimes, restTimes])
}
