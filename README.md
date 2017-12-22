# Observer

## Build

## Create deployment

    cd client
    make clean && make
    cd ..
    mkdir -p client/build/radar
    python fmi/collect_radar_products.py \
        /mnt/radar_observer/products | python collect.py client/build/radar
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
