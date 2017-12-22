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


utf8_stdout = codecs.getwriter('utf-8')(sys.stdout)
utf8_stderr = codecs.getwriter('utf-8')(sys.stderr)


def err(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = utf8_stderr
    return print(*args, **kwargs)

def pr(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = utf8_stdout
    return print(*args, **kwargs)


def collect(directory):
    if not os.path.isdir(directory):
        parser.error(u"Product directory '{}' must exist".format(directory))

    now = datetime.datetime.utcnow()
    dir_parts = [directory, str(now.year), str(now.month), str(now.day)]
    dir_path = os.path.abspath("/".join(dir_parts))

    products = []
    err(u"Scanning '{}' for product information files...".format(dir_path))
    for item in os.listdir(dir_path):
        if item.endswith(".json"):
            file_path = "/".join([dir_path, item])
            err(u"Reading in product information from '{}'...".format(file_path))
            with codecs.open(file_path, 'r') as f:
                contents = f.read()
                d = json.loads(contents)
                d["radar_id"] = d["site"]
                del d["site"]

                d["type"] = "radar_raster"
                d["metadata_file"] = file_path
                d["radar_name"] = radars[d["radar_id"]]["name"]
                d["radar_location"] = {"lon": radars[d["radar_id"]]["lon"],
                                       "lat": radars[d["radar_id"]]["lat"]}


                without_ext = os.path.splitext(file_path)[0]
                tiff_gz = without_ext + ".tiff.gz"
                tiff = without_ext + ".tiff"
                if os.path.isfile(tiff_gz):
                    d["data_file"] = tiff_gz
                elif os.path.isfile(tiff):
                    d["data_file"] = tiff
                else:
                    raise Exception(u'File {}(.gz) not found'.format(tiff))

                if "dbzh" in d["data_file"]:
                    d["product_name"] = "dbzh"
                    d["radar_product_info"] = {
                        "product_type": "PPI",
                        "data_type": "REFLECTIVITY",
                        "data_unit": "dBZ",
                        "polarization": "HORIZONTAL",
                        "data_scale": {
                            # (dBZ = step * pixval - offset)
                            "offset": -32,
                            "step": 0.5,
                            "not_scanned": 255,
                            "no_echo": 0
                        }
                    }
                elif "etop" in d["data_file"]:
                    d["product_name"] = "etop"
                    d["radar_product_info"] = {
                        "product_type": "TOPS",
                        "data_type": "HEIGHT",
                        "data_unit": "m"
                    }
                elif "hclass" in d["data_file"]:
                    d["product_name"] = "hclass"
                    d["radar_product_info"] = {
                        "product_type": "PPI",
                        "data_type": "HYDROMETEOR_CLASSIFICATION",
                        "data_unit": "HCLASS_UNIT"
                    }
                elif "vrad" in d["data_file"]:
                    d["product_name"] = "vrad"
                    d["radar_product_info"] = {
                        "product_type": "PPI",
                        "data_type": "RADIAL_VELOCITY",
                        "data_unit": "m/s"
                    }
                else:
                    err(d["data_file"])
                    foo

                assert os.path.isfile(d["metadata_file"])
                products.append(d)
    return products


if __name__ == '__main__':
    from argparse import ArgumentParser

    parser = ArgumentParser()
    parser.add_argument("directory",
                        help="product directory shared with fmi_product_download")
    args = parser.parse_args()
    pr(json.dumps(collect(args.directory)))
