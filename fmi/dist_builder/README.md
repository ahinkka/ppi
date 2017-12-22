# FMI distribution builder

`collect_radar_products.py` creates a JSON output suitable for the top-level
`collect.py`.


## TIFFs and their metadata

This is probably some kind of dump from FMI system - would be nice to have it
in the TIFFs as well?


    GDAL_METADATA=<GDALMetadata>
     <Item name="Quantity" unit="dBZ">Corrected reflectivity</Item>
     <Item name="Gain">0.500000</Item>
     <Item name="Offset">-32.000000</Item>
     <Item name="Nodata">255</Item>
     <Item name="Undetect">0</Item>
     <Item name="Elevation angle" unit="deg">5.0</Item>
     <Item name="Bin length" unit="m">500</Item>
     <Item name="Bins per ray">500</Item>
     <Item name="Rays per scan">360</Item>
    </GDALMetadata>


But the following is something current, I hope.


    So, the dBZ = Gain * pixval + Offset

    (dBZ = 0.5 * pixval - 32)

    The pixel value 0 indicates no echo detected and value 255 means no data
    available (typically out of radar range).

    The "h" in dbzh stands for horizontal polarization.

