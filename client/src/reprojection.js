import proj4 from 'proj4'
proj4.defs("EPSG:3067","+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")

export const productToMap = (productProjectionDescription, mapProjectionDescription) => {
  const p = proj4(productProjectionDescription, mapProjectionDescription)
  return [p.forward, p.inverse]
}
