const serializeHash = (contents: { [key: string]: string | number | boolean }) => {
  const keys = Object.keys(contents)
  keys.sort()
  let result = '#'
  let first = true;
  for (const key of keys) {
    const value = contents[key]
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
  const parts = hash.slice(1).split('&')
  const result = {}
  for (const part of parts) {
    const [key, value] = part.split('=')
    result[key] = value
  }
  return result
}
