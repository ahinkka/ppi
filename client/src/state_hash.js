export const makeHashFromState = (state) => {
  let site = state.selection.site[0]
  let product = state.selection.product[0]
  let flavor = state.selection.flavor[0]
  let animationRunning = state.animation.running
  return `#site=${site}&product=${product}&flavor=${flavor}&animationRunning=${animationRunning}`
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
