"""
Reader for gzipped TIFFs.
"""
from __future__ import print_function

import collections
import gzip
import struct
import sys
import tempfile

import gdal
gdal.UseExceptions()


Raster = collections.namedtuple('Raster', ['width', 'height', 'projection_ref', 'affine_transform',
                                           'bands'])
Band = collections.namedtuple('Band', ['no_data_value', 'unit_type', 'scale', 'offset', 'data'])


def extract_metadata(gdal_object):
    result = {}
    for i in dir(gdal_object):
        if "__" in i:
            continue


        # print(u"METHOD {}".format(i))
        if i.startswith('Get'):
            try:
                k = str(i)[3:]
                v = getattr(gdal_object, i)()
                print(u"###### KEY:{} == VALUE:{}".format(k, v))
                result[k] = v
            except TypeError, te:
                pass
    return result


def gdal_to_raster(gdal_raster):
    width = gdal_raster.RasterXSize
    height = gdal_raster.RasterYSize
    band_count = gdal_raster.RasterCount
    projection_ref = gdal_raster.GetProjectionRef()
    transform =  gdal_raster.GetGeoTransform()
    # print width, height, band_count

    bands = []
    for i in xrange(1, band_count + 1):
        # print i
        band = gdal_raster.GetRasterBand(i)
        # print band
        data_type = gdal.GetDataTypeName(band.DataType)

        # print(extract_metadata(band))
        # sys.exit()

        rows = []
        for x in xrange(width):
            row = []
            rows.append(row)
            for y in xrange(height):
                try:
                    value_array = band.ReadRaster(x, y, 1, 1)
                except RuntimeError, e:
                    if "GetBlockRef failed at X block offset" in str(e):
                        value_array = None
                    else:
                        raise e
                if data_type != 'Byte':
                    raise Exception("Unhandled element type: " + data_type)

                if value_array is None:
                    value = None
                else:
                    value = struct.unpack('B', value_array[0])[0]

                row.append(value)
            # grid = band.ReadRaster(0, 0, width, height)
            # print grid

        bands.append(
            Band(
                no_data_value=band.GetNoDataValue(),
                unit_type=band.GetUnitType(),
                offset=band.GetOffset(),
                scale=band.GetScale(),
                data=rows))


        # print dir(gdal_raster)
        # print gdal_raster.GetMetadata()

    return Raster(width=width, height=height, projection_ref=projection_ref,
                  affine_transform=transform, bands=bands)


def read_tiff(path):
    if path.endswith('.gz'):
        with gzip.open(path, 'rb') as input_file:
            file_contents = input_file.read()
            with tempfile.NamedTemporaryFile() as temp_file:
                temp_file.write(file_contents)
                gdal_raster = gdal.Open(temp_file.name)
                return gdal_to_raster(gdal_raster)
    else:
        gdal_raster = gdal.Open(path)
        return gdal_to_raster(gdal_raster)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        sys.exit("Need the file name as the first argument.")
    print(read_tiff(sys.argv[1]))
