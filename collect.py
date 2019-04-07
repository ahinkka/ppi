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
            "name": ...,       # human-readable name of the product
            "flavors": [       # flavors enable sub-selections for a product
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

    for site, site_dict in result.iteritems():
        err(u"Site {} ({})".format(site_dict["display"], site))
        for product_id, product in site_dict["products"].iteritems():
            err(u"  Product {} ({})".format(product["display"], product_id))
            for flavor_id, flavor in product["flavors"].iteritems():
                if len(flavor["times"]) > 5:
                    times = [t["time"] for t in [flavor["times"][0], flavor["times"][-1]]]
                    times.insert(1, "...")
                else:
                    times = [t["time"] for t in flavor["times"]]
                err(u"    Flavor {} ({})".format(flavor["display"], flavor_id))
                err(u"      {}".format(u", ".join(times)))

    return result, sources_dests_infos


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

    input_products = []
    for item in iload_json(input_data):
        for i in item:
            input_products.append(i)


    sites, sources_dests_infos = collect_radar_rasters(input_products)

    with open(os.path.join(directory, "catalog.json"), "w") as f:
        catalog = copy.deepcopy(sites)
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
                process.stdin.write(json.dumps(additional_metadata))
                process.stdin.close()
                process.wait()
            err(u"Written. Compressing...")
            subprocess.check_call(["gzip", "-v", dest_path])
            err(u"Exported in {} s".format((datetime.datetime.now() - started).total_seconds()))
        except KeyboardInterrupt, kbi:
            raise kbi
        except Exception, e:
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
