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

export type UrlState = {
  siteId: string | null,
  productId: string | null,
  flavorId: string | null,
  animationRunning: boolean,
  currentLon: number,
  currentLat: number
}

export const makeHashFromState = (urlState: UrlState) => {
  return serializeHash(
    {
      site: urlState.siteId,
      product: urlState.productId,
      flavor: urlState.flavorId,
      animationRunning: urlState.animationRunning,
      lon: urlState.currentLon,
      lat: urlState.currentLat
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
