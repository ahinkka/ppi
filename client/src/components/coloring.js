import {DataValueType, integerToDataValue} from './datavalue'


// Global not scanned color; see fillWithNotScanned before changing this
export const NOT_SCANNED_COLOR = [211, 211, 211, 76]
// Global no echo color (transparent black)
export const NO_ECHO_COLOR = [0, 0, 0, 0]


export const ScaleRangeType = {
  STEP: 'step',
}


// TODO: the actual colors might not be completely correct. This is the scale
//       as described in Wikipedia.  This is a discrete scale for reflectivity
//       ranges.
const NOAALowRedGreenBlue = [
  // ND  96  101 97
  [-30, 208, 255, 255],
  [-25, 198, 152, 189],
  [-20, 154, 104, 155],
  [-15, 95,  47,  99],
  [-10, 205, 205, 155],
  [-5,  155, 154, 106],
  [0,   100, 101, 96],
  [5,   12,  230, 231],
  [10,  1,   161, 249],
  [15,  0,   0,   238],
  [20,  4,   252, 5],
  [25,  0,   200, 6],
  [30,  0,   141, 1],
  [35,  250, 242, 0],
  [40,  229, 188, 0],
  [45,  255, 157, 7],
  [50,  253, 0,   2],
  [55,  215, 0,   0],
  [60,  189, 1,   0],
  [65,  253, 0,   246],
  [70,  154, 86,  195],
  [75,  248, 246, 247]]


const _reflectivityValueToNOAAColor = (reflectivityValue) => {
  for (let index=0; index<NOAALowRedGreenBlue.length; index++) {
    const [low, red, green, blue] = NOAALowRedGreenBlue[index]
    if (index == NOAALowRedGreenBlue.length - 1) {
      return [red, green, blue]
    }

    const nextLow = NOAALowRedGreenBlue[index + 1][0]
    if (reflectivityValue >= low && reflectivityValue < nextLow) {
      return [red, green, blue]
    }
  }

  return [null, null, null]
}


const _reflectivityValueToNOAAColorCache = {}
export const reflectivityValueToNOAAColor = (reflectivityValue) => {
  if (!(reflectivityValue in _reflectivityValueToNOAAColorCache)) {
    _reflectivityValueToNOAAColorCache[reflectivityValue] =
      _reflectivityValueToNOAAColor(reflectivityValue)
  }
  return _reflectivityValueToNOAAColorCache[reflectivityValue]
}


// TODO: rendering on screen
export const NOAAScaleToScaleDescription = () => {
  let result = []
  for (let rowIndex=0; rowIndex<NOAALowRedGreenBlue.length; rowIndex++) {
    let nextRowIndex = rowIndex + 1
    const [low, red, green, blue] = NOAALowRedGreenBlue[rowIndex]

    if (nextRowIndex < NOAALowRedGreenBlue.length) {
      const [nextLow, nextRed, nextGreen, nextBlue] = NOAALowRedGreenBlue[nextRowIndex] // eslint-disable-line no-unused-vars
      result.push({
        type: ScaleRangeType.STEP,
        start: { value: low, open: false },
        end: { value: nextLow, open: false },
        color: [red, green, blue]
      })
    } else {
      result.push({
        type: ScaleRangeType.STEP,
        start: { value: low, open: false },
        end: { value: low + 1, open: true },
        color: [red, green, blue]
      })
    }
  }

  return result
}


export const resolveColorForReflectivity = (dataScale, value) => {
  const [valueType, dataValue] = integerToDataValue(dataScale, value)
  if (valueType == DataValueType.NOT_SCANNED) {
    return NOT_SCANNED_COLOR
  } else if (valueType == DataValueType.NO_ECHO) {
    return NO_ECHO_COLOR
  } else if (valueType == DataValueType.VALUE) {
    const [r, g, b] = reflectivityValueToNOAAColor(dataValue)
    return [r, g, b, 255]
  } else {
    throw new Error('Unknown DataValueType: ' + valueType)
  }
}


export const resolveColorGeneric = (dataScale, value) => {
  if (value == dataScale.notScanned) {
    return NOT_SCANNED_COLOR
  } else {
    return [0, 0, 255, Math.floor((value / 150) * 255)]
  }
}


export const fillWithNotScanned = (dataArray) => {
  dataArray.fill(NOT_SCANNED_COLOR[0])

  for (let i=3; i<dataArray.length; i = i + 4) {
    dataArray[i] = NOT_SCANNED_COLOR[3]
  }
}
