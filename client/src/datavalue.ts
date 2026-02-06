export enum DataValueType {
  NO_ECHO = 'no echo',
  NOT_SCANNED = 'not scanned',
  VALUE = 'value'
}

export type LinearInterpolationDataScale = {
  readonly tag: 'LinearInterpolationDataScale',
  step: number,
  offset: number,
  notScanned: number,
  noEcho: number,
}

export type HydroMeteorType = 'NON_MET' | 'RAIN' | 'WET_SNOW' | 'DRY_SNOW' | 'GRAUPEL' | 'HAIL'

export type Hclass = HydroMeteorType | 'NO_SIGNAL' | 'NOT_SCANNED'

export type HclassDataScale = {
  readonly tag: 'HclassDataScale',
  mapping: Record<number, Hclass>,
  notScanned: number,
  noEcho: number
}

export type DataScale = LinearInterpolationDataScale | HclassDataScale

export function integerToDataValue(
  dataScale: LinearInterpolationDataScale,
  intValue: number
): [string, number | null] {
  if (intValue == dataScale.noEcho) {
    return [DataValueType.NO_ECHO, null]
  } else if (intValue == dataScale.notScanned) {
    return [DataValueType.NOT_SCANNED, null]
  } else {
    const dataValue = dataScale.offset + intValue * dataScale.step
    return [DataValueType.VALUE, dataValue]
  }
}
