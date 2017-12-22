"""http://wms.fmi.fi/fmi-apikey/{key}/geoserver/Radar/wms?service=WMS&version=1.3.0&request=GetCapabilities

Finnish composite, products:
 dbz   radar reflectivity
 rr    rain intensity
 rr1h  rain 1h
 rr12h rain 12h
 rr24h rain 24h

Individual radars:
 dbz     radar reflectivity
 vrad    radial velocity
 hclass  water form classification
 etop_20 echo tops 20(?)

Two different styles: by default the colored image, but if lossless is
required, the image should be downloaded in "raster" style.

Parameterized by time.  Individual radars also require elevation parameter.

Use GeoTIFF output format.

Black and white images the value describes the parameter value.

For radar reflectivity it is the proportional reflectivity; p = dbz*2+64,
where p is pixel's value.  For rain intensity one value corresponds to 0.01
mm/h of rain and in in cumulative images 0.01 mm of rain.

"""
from __future__ import print_function

import sys
import traceback
import codecs
import json
import urllib

from os import environ as env
from os import getcwd, unlink, makedirs
from os.path import join as path_join
from os.path import exists as path_exists

from string import Template
from datetime import datetime
from urllib import quote_plus as quote

import dateutil.parser

from owslib.wms import WebMapService

utf8_stdout = codecs.getwriter('utf-8')(sys.stdout)
utf8_stderr = codecs.getwriter('utf-8')(sys.stderr)


BASE_URL = "http://wms.fmi.fi/fmi-apikey/{key}/geoserver/Radar/ows" # ?SERVICE=WMS"
MIME = "image/geotiff"
CRS = "CRS:84"
STYLE = "raster"

DEFAULT_SIDE_LENGTH = 2048
DEFAULT_SITES = ['luosto', 'anjalankoski', 'ikaalinen', 'vimpeli', 'utajarvi',
                 'kuopio', 'vantaa', 'korpo', 'petajavesi', 'kesalahti']

sample_config = """
[fmi_product_download]
sites = %s
side-length = %i
output-directory = %s
fmi-api-key = %s
""" % (", ".join(DEFAULT_SITES), DEFAULT_SIDE_LENGTH, getcwd(),
       env.get("FMI_API_KEY", "???"))


def last_time_position(obj):
    """
    Parses the last time from a given object.  Sometimes a list, sometimes
    a string in the form x/y/z where y is the latest time position.
    """
    if len(obj) == 1 and isinstance(obj[0], basestring):
        parts = obj[0].split("/")
        return parts[1]
    else:
        return obj[-1]


def format_iso_8601(time_object):
    """ISO 8601, standard. Yeah right."""
    result = time_object.isoformat()
    if result.endswith("+00:00"):
        return result.replace("+00:00", "Z")
    else:
        return result


class Product(object):
    def __init__(self, layer_name, site, product, bounding_box, last_time_position, elevation=None):
        self.layer_name = layer_name
        self.site = site
        self.product = product
        self.bounding_box = bounding_box
        self.last_time_position = last_time_position
        self.last_time_date = dateutil.parser.parse(last_time_position)
        self.elevation = elevation

    def file_name(self):
        if self.elevation:
            return u"{0}--{1}--{2}--{3}".format(self.site, self.product,
                                                self.elevation,
                                                # "_".join(map(str, self.bounding_box)),
                                                self.last_time_position)
        else:
            return u"{0}--{1}--{2}".format(self.site, self.product,
                                           # "_".join(map(str, self.bounding_box)),
                                           self.last_time_position)

    def url(self, api_key=env.get('FMI_API_KEY'), side_length=DEFAULT_SIDE_LENGTH):
        template = Template("http://wms.fmi.fi/fmi-apikey/$key/geoserver/Radar/wms?service=WMS&version=1.3.0&request=GetMap&CRS=CRS:84&BBOX=$bbox&WIDTH=$side_length&HEIGHT=$side_length&LAYERS=$layer&FORMAT=$format&time=$time")

        return template.substitute({
            "key": api_key,
            "bbox": ",".join(map(str, self.bounding_box)),
            "layer": quote(self.layer_name),
            "format": quote(MIME),
            "time": quote(format_iso_8601(self.last_time_date)),
            "side_length": side_length
        })

    def metadata(self):
        return {
            'site': self.site,
            'product': self.product,
            'min_lon': self.bounding_box[0],
            'min_lat': self.bounding_box[1],
            'max_lon': self.bounding_box[2],
            'max_lat': self.bounding_box[3],
            'time': self.last_time_date,
            'elevation': self.elevation
        }


def fetch_product_list(api_key=env.get("FMI_API_KEY"), side_length=DEFAULT_SIDE_LENGTH,
                       sites=DEFAULT_SITES):
    wms = WebMapService(BASE_URL.replace("{key}", api_key), version='1.1.1')

    layers = list(wms.contents)

    products = []
    for layer_name in layers:
        layer = wms[layer_name]

        if not layer.queryable:
            continue

        site = layer_name.split("_")[0]
        if site not in sites:
            continue

        product_name = "_".join(layer_name.split("_")[1:])

        if layer.elevations:
            for elevation in layer.elevations:
                product = Product(layer_name, site, product_name,
                                  layer.boundingBoxWGS84,
                                  last_time_position(layer.timepositions),
                                  elevation=elevation)
                products.append(product)
        else:
            product = Product(layer_name, site, product_name,
                              layer.boundingBoxWGS84,
                              last_time_position(layer.timepositions))
            products.append(product)

    return products


def read_configuration(path):
    import ConfigParser
    import io

    config = ConfigParser.RawConfigParser(allow_no_value=True)
    with codecs.open(path, 'r', encoding='utf-8') as f:
        config.readfp(f)

    get = lambda key: config.get("fmi_product_download", key)

    return {
        "sites": [s.strip() for s in get("sites").split(',')],
        "side-length": int(get("side-length")),
        "output-directory": get("output-directory"),
        "fmi-api-key": get("fmi-api-key")
    }


def default(obj):
    """Default JSON serializer."""
    import calendar

    if isinstance(obj, datetime):
        return obj.isoformat()
    else:
        raise Exception("Unknown type")


def main():
    from optparse import OptionParser

    parser = OptionParser()
    parser.add_option("-d", "--dry-run", dest="dry_run",
                      help="Don't actually download anything",
                      action="store_true", default=False)
    parser.add_option("-c", "--config", dest="config",
                      help="read configuration from FILE", metavar="FILE")
    opts, args = parser.parse_args()

    try:
        configuration = read_configuration(opts.config)
        print(configuration, file=utf8_stderr)
    except Exception, e:
        traceback.print_exc()
        print()
        print("Sample configuration:")
        print("---")
        print(sample_config)
        print("---")
        parser.error("Couldn't read configuration file passed in")

    products = fetch_product_list(sites=configuration['sites'], api_key=configuration['fmi-api-key'],
                                  side_length=configuration['side-length'])

    for index, product in enumerate(products):
        if not opts.dry_run:
            now = datetime.utcnow()
            dir_part = [configuration['output-directory'], str(now.year), str(now.month), str(now.day)]
            if not path_exists(path_join(*dir_part)):
                makedirs(path_join(*dir_part))
            
            json_dest_path = path_join(*(dir_part + [product.file_name() + ".json"]))
            tiff_dest_path = path_join(*(dir_part + [product.file_name() + ".tiff"]))

            url = product.url(api_key=configuration['fmi-api-key'],
                              side_length=configuration['side-length'])

            if path_exists(json_dest_path):
                print("%s already exists, not downloading %s" % (json_dest_path, url),
                      file=utf8_stderr)
            else:
                if path_exists(tiff_dest_path):
                    unlink(tiff_dest_path)
                urllib.urlretrieve(url, tiff_dest_path)

                with codecs.open(json_dest_path, 'w', encoding='utf-8') as f:
                    json.dump(product.metadata(), f, default=default,
                              ensure_ascii=False, indent=4)
                print(tiff_dest_path)

        json.dump(product.metadata(), utf8_stderr, default=default,
                  ensure_ascii=False, indent=4)
        print(file=utf8_stderr)
        print("%i/%i" % (index + 1, len(products)),
              file=utf8_stderr)


if __name__ == '__main__':
    main()
