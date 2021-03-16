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
import operator
import os
import subprocess
import sys
import traceback


def err(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = sys.stderr
    return print(*args, **kwargs)


def pr(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = sys.stdout
    return print(*args, **kwargs)


def camelcapsify(snake_str):
    """From http://stackoverflow.com/a/19053800"""
    components = snake_str.split('_')
    return components[0] + "".join(x.title() for x in components[1:])


def camelcapsify_dict(d):
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            v = camelcapsify_dict(v)
        result[camelcapsify(k)] = v
    return result


def collect_radar_rasters(input_products):
    """Collects radar rasters from the list of all products.

    Args:
        List of product dicts. Each dict contains the field 'type'. This
        function works with dicts with type 'RADAR RASTER'. Discards
        everything else.

    Returns:
        A dict where keys are site ids and values site objects.

        Site object is as follows:
          { "lon": ..., "lat": ..., "display": ..., "products": {...} }
        where coordinates are in WGS84 system and display is a human-readable
        name for the site.

        Product dict has product ids as keys, dicts as values as follows:
          {
            "display": ...,    # human-readable name of the product (UI-displayable)
            "flavors": [       # flavors enable sub-selections for a product
              "0.5": [         # if only one flavor, use 'default' for no selector
                {              # each item under flavor is one timestep, a distinct product
                  "time": ..., # timestamp as UTC ISO8601, JS compatible format
                  "url": ...,  # relative URL to the product file
                  "productInfo": ...
                },
              }
            ]
          }

        Product info is a dict containing information required to display the,
        product, for example:
          {
            "dataScale": {
                "noEcho": 0,
                "notScanned": 252,
                "offset": -32,
                "step": 0.5
          },
            "dataType": "REFLECTIVITY",
            "dataUnit": "dBZ",
            "polarization": "HORIZONTAL",
            "productType": "PPI"
          }

        Here data scale describes what the actual data unit values are; two
        special values are included: noEcho and notScanned. Offset specifies
        what 0 means (if it wasn't mapped to noEcho), here -32 dBZ, and the
        actual value can be calculated by multiplying the step. E.g. if we
        have the value 100 in the product data array, it would be
        -32 + 100 * 0.5 = 18 dBZ.
    """
    radar_rasters = [product
                     for product in input_products
                     if product['type'] == 'RADAR RASTER']

    result = {}
    sources_dests_infos = []
    for product in radar_rasters:
        if product["data_file"].endswith(".tiff.gz"):
            dest_path = os.path.basename(product["data_file"]).replace(".tiff.gz", ".json")
        elif product["data_file"].endswith(".tiff"):
            dest_path = os.path.basename(product["data_file"]).replace(".tiff", ".json")
        else:
            raise Exception("Data file with unknown extension: {}"
                            .format(product["data_file"]))
        final_dest_path = dest_path + ".gz"

        if product["site_id"] not in result:
            result[product["site_id"]] = {
                "lon": product["site_location"]["lon"],
                "lat": product["site_location"]["lat"],
                "display": product["site_name"],
                "products": {}
            }
        site_dict = result[product["site_id"]]

        products_dict = site_dict["products"]
        product_id = product["product_id"]

        if product_id not in products_dict:
            products_dict[product_id] = {
                "display": product["product_name"],
                "flavors": {}
            }
        product_dict = products_dict[product_id]

        flavors_dict = product_dict["flavors"]

        if product["elevation"] is not None:
            flavor_key = str(product["elevation"])
        else:
            flavor_key = "default"

        if flavor_key not in flavors_dict:
            flavors_dict[flavor_key] = {
                "display": flavor_key,
                "type": "RADAR RASTER",
                "times": []
            }

        # "sourceFile": product["data_file"],
        # "destinationFile": dest_path,
        flavors_dict[flavor_key]["times"].append({
            "productInfo": camelcapsify_dict(product["radar_product_info"]),
            "time": product["time"],
            "url": final_dest_path
        })
        
        flavors_dict[flavor_key]["times"].sort(key=operator.itemgetter("time"))
        sources_dests_infos.append((product["data_file"], dest_path, product["radar_product_info"]))

    for site, site_dict in result.items():
        err(u"Site {} ({})".format(site_dict["display"], site))
        for product_id, product in site_dict["products"].items():
            err(u"  Product {} ({})".format(product["display"], product_id))
            for flavor_id, flavor in product["flavors"].items():
                if len(flavor["times"]) > 5:
                    times = [t["time"] for t in [flavor["times"][0], flavor["times"][-1]]]
                    times.insert(1, "...")
                else:
                    times = [t["time"] for t in flavor["times"]]
                err(u"    Flavor {} ({})".format(flavor["display"], flavor_id))
                err(u"      {}".format(u", ".join(times)))

    return result, sources_dests_infos


def collect_points_of_interest(input_products):
    """Collects points of interests from the list of all products.

    Args:
        List of product dicts. Each dict contains the field 'type'. This
        function works with dicts with type 'POINT OF INTEREST'. Discards
        everything else.

    Returns:
        A dict with keys "towns" and "cities". These contain lists of dicts
        with keys "lon", "lat" and "name".  Coordinates are in WGS84.
    """
    pois = [product
            for product in input_products
            if product['type'] == 'POINT OF INTEREST']

    result = {'towns': [], 'cities': []}
    sources_dests_infos = []
    for product in pois:
        if product['locality_type'] == 'town':
            result['towns'].append({
                'lon': product['lon'],
                'lat': product['lat'],
                'name': product['name']
            })
        elif product['locality_type'] == 'city':
            result['cities'].append({
                'lon': product['lon'],
                'lat': product['lat'],
                'name': product['name']
            })

    return result


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


def collect(infile, exporter, directory):
    if not os.path.isdir(directory):
        parser.error(u"Output directory '{}' must exist".format(directory))

    lines = []
    for line in infile:
        lines.append(line)
    input_data = "".join(lines)
    input_products = list(iload_json(input_data))

    sites, sources_dests_infos = collect_radar_rasters(input_products)
    points_of_interest = collect_points_of_interest(input_products)

    with open(os.path.join(directory, "catalog.json"), "w") as f:
        catalog = {
            'radarProducts': copy.deepcopy(sites),
            'pointsOfInterest': copy.deepcopy(points_of_interest)
        }
        json.dump(catalog, f)

    skipped_count = 0
    # TODO: parallelize, this should be embarrassingly easy
    for src, dst, product_info in sources_dests_infos:
        try:
            dest_path = os.path.join(directory, dst)

            if os.path.exists(dest_path + '.gz') and os.path.getsize(dest_path + '.gz') > 0:
                err('Not dumping {}, already exists and is not an empty file!'.format(dest_path))
                skipped_count += 1
                continue

            # err(dest_path)
            # err(camelcapsify_dict(product_info))
            additional_metadata = {"productInfo": camelcapsify_dict(product_info)}
            # TODO: document how an exporter should work
            started = datetime.datetime.now()
            err(u"Running command {}".format(u' '.join([exporter, src])))

            with open(dest_path, "w") as f:
                err(u"Writing product as JSON to '{}'...".format(dest_path))
                process = subprocess.Popen([exporter, src],
                                           stdout=f, stdin=subprocess.PIPE)
                process.stdin.write(json.dumps(additional_metadata).encode('utf-8'))
                process.stdin.close()
                process.wait()
            err(u"Written. Compressing...")
            subprocess.check_call(["gzip", "-v", dest_path])
            err(u"Exported in {} s".format((datetime.datetime.now() - started).total_seconds()))
        except KeyboardInterrupt as kbi:
            raise kbi
        except Exception as e:
            err(u"Couldn't export {}: {}".format(src, e))
            err(traceback.format_exc())

    err('Exported {} products, skipped {}'.format(len(sources_dests_infos), skipped_count))


if __name__ == '__main__':
    from argparse import ArgumentParser
    parser = ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('infile', nargs='?', type=argparse.FileType('r'),
                        default=sys.stdin,
                        help="JSON input such as produced by collect_radar_products.py")
    parser.add_argument('exporter',
                        help='exporter command to run the product files through, see raster_to_json.py for an example')
    parser.add_argument("directory",
                        help="output directory to produce distribution in")
    args = parser.parse_args()
    collect(args.infile, args.exporter, args.directory)
