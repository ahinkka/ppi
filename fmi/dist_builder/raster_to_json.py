from __future__ import print_function

import json
import sys

import tiff_reader


if __name__ == "__main__":
    additional_metadata = json.load(sys.stdin)

    raster = tiff_reader.read_tiff(sys.argv[1])

    if len(raster.bands) != 1:
        sys.exit("Exactly one band expected!")
    band = raster.bands[0]

    result = {}
    result['data'] = band

    metadata = {}
    metadata['width'] = raster.width
    metadata['height'] = raster.height
    metadata['projectionRef'] = raster.projection_ref
    metadata['affineTransform'] = raster.affine_transform

    for k, v in additional_metadata.iteritems():
        metadata[k] = v

    result['metadata'] = metadata

    json.dump(result, sys.stdout)
    # print(raster)
