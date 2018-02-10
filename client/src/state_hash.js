const serializeHash = (contents) => {
  let keys = Object.keys(contents)
  keys.sort()
  let result = "#"
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


export const makeHashFromState = (state) => {
  return serializeHash(
    {
      site: state.selection.site[0],
      product: state.selection.product[0],
      flavor: state.selection.flavor[0],
      animationRunning: state.animation.running,
      lon: state.map.current.centerLon,
      lat: state.map.current.centerLat,
    })
}


export const parseHash = (hash) => {
  let parts = hash.slice(1).split("&")
  let result = {}
  for (let part of parts) {
    let [key, value] = part.split("=")
    result[key] = value
  }
  return result
}
