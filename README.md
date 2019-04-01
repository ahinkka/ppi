# Observer

## Build

## Create deployment

    cd client
    make clean && make
    cd ..
    mkdir -p client/build/radar
    python fmi/collect_radar_products.py /mnt/radar_observer/products | \
        python collect.py fmi/dist_builder/raster_to_json.py client/build/radar
    cd client
    make


## Design

This is a proper radar product display, in the browser.

The idea is to ship cartesian products as arrays of data values, not as
rasters.  Then render them on the client side.  The intention is to enable
actual proper radar display functionality so that tools such as a cursor tool
and proper data legend would be implementable.  This naturally first requires
data descriptors for all the data types (and related color scales), then
proper bilinear interpolation between what's shown on the screen and what the
product coordinate system is.

Good defaults for color scales are probably ones from NEXRAD or Vaisala's
IRIS.

It is probably quite tricky to make the bilinear lookup tables work well.
Probably a good first estimation is to just go 400 km from each radar site for
each zoom level.


## Thoughts and Ideas
 - Line density display:
   https://twitter.com/archillect/status/938533533810937856
 - FMI summer color scale for reflectivity
   http://wms.fmi.fi/fmi-apikey/<>/geoserver/Radar/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=500&height=100&layer=anjalankoski_dbzh&style=Radar+dbz+Summer
   - From QGIS coloring, should look at the above legend graphic instead
     ```
     FMI reflectivity (summer)
     0 => 255, 255, 255   (nodata)
     21 => 108, 235, 243  (kohtalainen)
     62 => 65, 154, 90    (kohtalainen)
     84 => 241, 243, 90   (sakea)
     168 => 206, 2, 2     (sakea)
     189 => 131, 10, 70   (hyvin sakea)
     251 => 244, 244, 244 ()
     ```
 - NOAA dBZ scale
   ```
   ND  96  101 97
   -30 208 255 255
   -25 198 152 189
   -20 154 104 155
   -15 95  47  99
   -10 205 205 155
   -5  155 154 106
   0   100 101 96
   5   12  230 231
   10  1   161 249
   15  0   0   238
   20  4   252 5
   25  0   200 6
   30  0   141 1
   35  250 242 0
   40  229 188 0
   45  255 157 7
   50  253 0   2
   55  215 0   0
   60  189 1   0
   65  253 0   246
   70  154 86  195
   75  248 246 247
   ```
 - Smoothing where every value around is some data value and the value in the
   point is not scanned or no echo.
