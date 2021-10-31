import { State } from './types'

const serializeHash = (contents: { [key: string]: string | number | boolean }) => {
  let keys = Object.keys(contents)
  keys.sort()
  let result = '#'
  let first = true;
  for (const key of keys) {
    let value = contents[key]
    if (first) {
      result += `${key}=${value}`
      first = false
    } else {
      result += `&${key}=${value}`
    }
  }
  return result
}

export const makeHashFromState = (state: State) => {
  return serializeHash(
    {
      site: state.selection.siteId,
      product: state.selection.productId,
      flavor: state.selection.flavorId,
      animationRunning: state.animation.running,
      lon: state.map.current.centerLon,
      lat: state.map.current.centerLat,
    })
}


export const parseHash = (hash: string): { [key: string]: string } => {
  let parts = hash.slice(1).split('&')
  let result = {}
  for (let part of parts) {
    let [key, value] = part.split('=')
    result[key] = value
  }
  return result
}
