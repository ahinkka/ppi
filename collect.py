"""Collect a data distribution for web delivery.

Processes the metadata produced by other data collectors, collects data files
and produces the end result data distribution.

"""
from __future__ import print_function

import argparse
import codecs
import copy
import datetime
import json
import os
import subprocess
import sys


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


def camelcapsify(snake_str):
    """From http://stackoverflow.com/a/19053800"""
    components = snake_str.split('_')
    return components[0] + "".join(x.title() for x in components[1:])


def camelcapsify_dict(d):
    result = {}
    for k, v in d.iteritems():
        if isinstance(v, dict):
            v = camelcapsify_dict(v)
        result[camelcapsify(k)] = v
    return result


def collect_radar_rasters(all_products):
    """Collects radar rasters from the list of all products.

    Args:
        List of product dicts. Each dict contains the field 'type'. This
        function works with dicts with type 'radar_raster'. Discards
        everything else.

    Returns:
        A pair containing a radars dict and a product mapping dict.

        Radars object is as follows:
          {radar => { "id": ..., "lon": ..., "lat": ..., "display": ... }, ...} where
        coordinates are in WGS84 system and display is a human-readable name
        for the radar.

        Product mapping is as follows:
          (radar, productName) => {params} where params is like:

          {
            "radar": ...,      # same as in key
            "name": ...,       # same as in key; productName essentially
            "flavors": [       # flavors enable sub-selections for a product)
              "0.5": [         # if only one flavor, use 'default' for no selector)
                {              # each item under flavor is one timestep, a distinct product
                  "time": ..., # timestamp as UTC ISO8601, JS compatible format
                  "url": ...,  # relative URL to the product file
                },
              }
            ]
          }
    """
    radar_rasters = [product
                     for product in all_products
                     if product['type'] == 'radar_raster']

    products = {}
    radars = {}
    for p in radar_rasters:
        if p["data_file"].endswith(".tiff.gz"):
            dest_path = os.path.basename(p["data_file"]).replace(".tiff.gz", ".json")
        elif p["data_file"].endswith(".tiff"):
            dest_path = os.path.basename(p["data_file"]).replace(".tiff", ".json")
        else:
            raise Exception("Data file with unknown extension")

        radar = {
            "lon": p["radar_location"]["lon"],
            "lat": p["radar_location"]["lat"],
            "display": p["radar_name"],
            "id": p["radar_id"]
        }
        radars[p["radar_id"]] = radar

        key = (radar["id"], p["product_name"])
        if key in products:
            params = products[key]
        else:
            params = {
                "name": p["product_name"],
                "radar": radar["id"],
                "flavors": {},
            }

        if p.get("elevation", None) is not None:
            elevation = str(p["elevation"])
            if elevation in params["flavors"]:
                flavor = params["flavors"][elevation]
            else:
                flavor = params["flavors"][elevation] = []
        else:
            if "default" in params["flavors"]:
                flavor = params["flavors"]["default"]
            else:
                flavor = params["flavors"]["default"] = []

        flavor.append({
            "time": p["time"],
            "url": dest_path,
            "type": "RADAR_RASTER",
            "productInfo": camelcapsify_dict(p["radar_product_info"]),
            "sourceFile": p["data_file"],
            "destinationFile": dest_path,
        })
        products[key] = params

    err(u"Got {} radars".format(len(radars)))
    err(u"Got {} products".format(len(products)))
    return radars, products


def iload_json(buff, decoder=None, _w=json.decoder.WHITESPACE.match):
    """Generate a sequence of top-level JSON values declared in the
    buffer.

    From http://www.benweaver.com/blog/decode-multiple-json-objects-in-python.html

    >>> list(iload_json('[1, 2] "a" { "c": 3 }'))
    [[1, 2], u'a', {u'c': 3}]
    """

    decoder = decoder or json._default_decoder
    idx = _w(buff, 0).end()
    end = len(buff)

    try:
        while idx != end:
            (val, idx) = decoder.raw_decode(buff, idx=idx)
            yield val
            idx = _w(buff, idx).end()
    except ValueError as exc:
        raise ValueError('%s (%r at position %d).' % (exc, buff[idx:], idx))


def collect(directory):
    if not os.path.isdir(directory):
        parser.error(u"Output directory '{}' must exist".format(directory))

    lines = []
    for line in sys.stdin:
        lines.append(line)
    input_data = "".join(lines)

    input_products = []
    for item in iload_json(input_data):
        for i in item:
            input_products.append(i)


    radars, products = collect_radar_rasters(input_products)
    with open(os.path.join(directory, "index.json"), "w") as f:
        p = {}
        for k, v in products.iteritems():
            v = copy.deepcopy(v)
            p["|".join(k)] = v

            for flavor_key, product_list in v["flavors"].iteritems():
                new_products = []
                for product in product_list:
                    del product["destinationFile"]
                    del product["sourceFile"]
                    new_products.append(product)

        json.dump({"radars": radars, "products": p}, f)

    for product in products.itervalues():
        for flavor_name, flavor_items in product["flavors"].iteritems():
            for flavor_item in flavor_items: # these are really products
                source =  flavor_item["sourceFile"]
                to_file = flavor_item["destinationFile"]
                del flavor_item["sourceFile"]
                del flavor_item["destinationFile"]

                try:
                    dest_path = os.path.join(directory, to_file)
                    additional_metadata = {"productInfo": flavor_item["productInfo"]}
                    # TODO: make this parameterizable so it can be passed in
                    process = subprocess.Popen(["python", "fmi/dist_builder/raster_to_json.py", source],
                                               stdout=subprocess.PIPE, stdin=subprocess.PIPE)
                    contents, _ = process.communicate(json.dumps(additional_metadata))
                    with open(dest_path, "w") as f:
                        err(u"# Writing product as JSON to '{}'...".format(dest_path))
                        f.write(contents)
                        err(u"# Written.")
                    subprocess.check_call(["gzip", "-v", dest_path])
                    err(u"# Compressed.")
                except Exception, e:
                    err(u"Cannot dump {}".format(source))
                    err(e)
                # err(source)


if __name__ == '__main__':
    from argparse import ArgumentParser
    parser = ArgumentParser()
    parser.add_argument("directory",
                        help="output directory to produce distribution in")
    args = parser.parse_args()
    collect(args.directory)
