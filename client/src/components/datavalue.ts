// {
//     "productType": "PPI",
//     "polarization": "HORIZONTAL",
//     "dataUnit": "dBZ",
//     "dataType": "REFLECTIVITY",
//     "dataScale": {
//         "step": 0.5,
//         "offset": -32,
//         "notScanned": 252,
//         "noEcho": 0
//     }
// }
export enum DataValueType {
  NO_ECHO = 'no echo',
  NOT_SCANNED = 'not scanned',
  VALUE = 'value'
}

export type DataScale = {
  step: number,
  offset: number,
  notScanned: number,
  noEcho: number,
}

export const integerToDataValue = (dataScale: DataScale, intValue: number): [string, number | null] => {
  if (intValue == dataScale.noEcho) {
    return [DataValueType.NO_ECHO, null]
  } else if (intValue == dataScale.notScanned) {
    return [DataValueType.NOT_SCANNED, null]
  } else {
    const dataValue = dataScale.offset + intValue * dataScale.step
    return [DataValueType.VALUE, dataValue]
  }
}
