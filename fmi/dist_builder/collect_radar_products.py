"""Collect a data distribution for processing for web delivery.

A distribution contains an index file and data file paths rerefenced from the
index file.

"""
from __future__ import print_function

import argparse
import codecs
import datetime
import json
import os
import sys

from fmi_radars import radars


def err(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = sys.stderr
    return print(*args, **kwargs)

def pr(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = sys.stdout
    return print(*args, **kwargs)


def read_product(path):
    err("Reading in product information from '{}'...".format(path))
    with codecs.open(path, 'r') as f:
        contents = f.read()
        product = json.loads(contents)

    result = {}
    result["site_id"] = product["site"]
    result["type"] = "RADAR RASTER"
    result["metadata_file"] = path
    result["site_name"] = radars[result["site_id"]]["name"]
    result["site_location"] = {"lon": radars[result["site_id"]]["lon"],
                               "lat": radars[result["site_id"]]["lat"]}

    for key in ["elevation", "time", "min_lat", "min_lon", "max_lat", "max_lon"]:
        result[key] = product[key]

    without_ext = os.path.splitext(path)[0]
    tiff_gz = without_ext + ".tiff.gz"
    tiff = without_ext + ".tiff"
    if os.path.isfile(tiff_gz):
        result["data_file"] = tiff_gz
    elif os.path.isfile(tiff):
        result["data_file"] = tiff
    else:
        raise Exception(u'File {}(.gz) not found'.format(tiff))

    product_name = product["product"]
    result["product_name"] = product_name
    result["product_id"] = product_name
    if product_name == "dbzh":
        result["radar_product_info"] = {
            "product_type": "PPI",
            "data_type": "REFLECTIVITY",
            "data_unit": "dBZ",
            "polarization": "HORIZONTAL",
            "data_scale": {
                # (dBZ = step * pixval - offset)
                "offset": product["linear_transformation_offset"],
                "step": product["linear_transformation_gain"],
                "not_scanned": 252,
                "no_echo": 0
            }
        }
    else:
        err("Unhandled product name: {}".format(product_name))
        sys.exit(result["data_file"])

    assert os.path.isfile(result["metadata_file"])
    return result



def collect(directory):
    if not os.path.isdir(directory):
        parser.error("Product directory '{}' must exist".format(directory))

    # now = datetime.datetime.utcnow()
    # dir_parts = [directory, str(now.year), str(now.month), str(now.day)]
    # dir_path = os.path.abspath("/".join(dir_parts))

    products = []
    err("Scanning '{}' for product information files...".format(directory))

    for root, dirs, files in os.walk(directory):
        path = root.split(os.sep)
        # print((len(path) - 1) * '---', os.path.basename(root))

        for file in files:
            if file.endswith(".json"):
                products.append(read_product(os.path.join(root, file)))

    return products


if __name__ == '__main__':
    from argparse import ArgumentParser

    parser = ArgumentParser()
    parser.add_argument("directory",
                        help="product directory shared with fmi_product_download")
    args = parser.parse_args()
    pr(json.dumps(collect(args.directory)))
