import datetime
import json
import operator
import os
import subprocess
import sys
import traceback

from os import getcwd, unlink, makedirs
from os.path import join as path_join
from os.path import exists as path_exists
from datetime import datetime as dt
from datetime import timezone

import boto3
from botocore import UNSIGNED
from botocore.client import Config

import dateutil.parser


SITE_NAMES = {
    'fianj': 'Anjalankoski',
    'fikan': 'Kankaanpää',
    'fikes': 'Kesälahti',
    'fikor': 'Korpo',
    'fikuo': 'Kuopio',
    'filuo': 'Luosto',
    'finur': 'Nurmes',
    'fipet': 'Petäjävesi',
    'fiuta': 'Utajärvi',
    'fivan': 'Vantaa',
    'fivih': 'Vihti',
    'fivim': 'Vimpeli',
    'finradfast': 'Finland composite'
}
DEFAULT_SITES = sorted(SITE_NAMES.keys())


_product_bucket = 'fmi-opendata-radar-geotiff'


sample_config = """
[fmi_s3_product_download]
sites = %s
side-length = %s
output-directory = %s
""" % (", ".join(DEFAULT_SITES), 1000, os.getcwd())


class Product(object):
    def __init__(self, site, product, time, key, height=None, elevation=None,
                 linear_transformation_gain=None, linear_transformation_offset=None):
        self.site = site
        self.product = product
        self.time = time
        self.key = key
        self.height = height
        self.elevation = elevation
        self.linear_transformation_gain = linear_transformation_gain
        self.linear_transformation_offset = linear_transformation_offset

    def file_name(self):
        if self.elevation:
            return u"{0}--{1}--{2}--{3}".format(self.site, self.product, self.elevation, self.time)
        elif self.height:
            return u"{0}--{1}--{2}--{3}".format(self.site, self.product, self.height, self.time)
        else:
            return u"{0}--{1}--{2}".format(self.site, self.product, self.time)

    def metadata(self):
        result = {
            'site': self.site,
            'product': self.product,
            'time': self.time,
            'linear_transformation_gain': self.linear_transformation_gain,
            'linear_transformation_offset': self.linear_transformation_offset
        }

        if self.elevation:
            result['elevation'] = self.elevation
        elif self.height:
            result['height'] = self.height

        return result


def parse_datetime_from_filename(key):
    filename = key.split('/')[-1]
    timestamp_part = filename.split('_')[0]
    parsed = dt.strptime(timestamp_part, '%Y%m%d%H%M')

    if parsed.tzinfo:
        return parsed
    else:
        return parsed.replace(tzinfo=timezone.utc)


def fetch_latest_composite_product(client, site):
    date_prefix = dt.now(datetime.UTC).strftime('%Y/%m/%d')
    product_name = 'acrr1h'
    prefix = f'{date_prefix}/{site}'
    raw_entries = [
        o for o in list_objects(client, _product_bucket, prefix)
        if product_name in o['Key'] # there's also acrr3h products in the directory
    ]

    latest = sorted(
        raw_entries,
        key=lambda d: parse_datetime_from_filename(d['Key']),
        reverse=True
    )[0]

    # https://en.ilmatieteenlaitos.fi/radar-data-on-aws-s3
    #  radar reflectivity (dbz), conversion: Z[dBZ] = 0.5 * pixel value - 32
    linear_transformation_gain = 0.5
    linear_transformation_offset = -32
    height = '250m'
    product_time = parse_datetime_from_filename(latest['Key'])

    return Product(site, product_name, product_time, latest['Key'],
                   height=height,
                   linear_transformation_gain=linear_transformation_gain,
                   linear_transformation_offset=linear_transformation_offset)


def list_objects(client, bucket, prefix):
    result = []
    continuation_token = None
    while True:
        if continuation_token:
            response = client.list_objects_v2(
                Bucket=_product_bucket,
                Prefix=prefix,
                ContinuationToken=continuation_token
            )
        else:
            response = client.list_objects_v2(
                Bucket=_product_bucket,
                Prefix=prefix
            )

        for entry in response['Contents']:
            result.append(entry)

        if 'NextContinuationToken' in response:
            continuation_token = response['NextContinuationToken']
        else:
            break

    return result


def with_datetime_and_product_name(entry):
    result = dict(entry)
    result['filename_datetime'] = parse_datetime_from_filename(entry['Key'])
    filename = entry['Key'].split('/')[-1]
    filename_without_extension = '.'.join(filename.split('.')[:-1]) # 202501201930_fivih_ppi_0.7_dbzh_qc
    result['product_name'] = filename_without_extension.split('_')[4]
    return result


def fetch_latest_product(client, site, product_name):
    date_prefix = dt.now(datetime.UTC).strftime('%Y/%m/%d')
    site_suffix = f'{site}'
    prefix = f'{date_prefix}/{site_suffix}'
    raw_entries = list_objects(client, _product_bucket, prefix)
    entries = [with_datetime_and_product_name(f) for f in raw_entries]

    latest = sorted(
        [e for e in entries if e['product_name'] == product_name],
        key=operator.itemgetter('filename_datetime'),
        reverse=True
    )[0]

    # https://en.ilmatieteenlaitos.fi/radar-data-on-aws-s3
    #  radar reflectivity (dbz), conversion: Z[dBZ] = 0.5 * pixel value - 32
    linear_transformation_gain = 0.5
    linear_transformation_offset = -32
    height = '250m'
    product_time = parse_datetime_from_filename(latest['Key'])

    return Product(site, product_name, product_time, latest['Key'],
                   linear_transformation_gain=linear_transformation_gain,
                   linear_transformation_offset=linear_transformation_offset)


def fetch_product_list(sites=DEFAULT_SITES):
    client = boto3.client('s3', config=Config(signature_version=UNSIGNED))

    result = []
    for site in sites:
        try:
            if 'finrad' in site:
                product = fetch_latest_composite_product(client, site)
            else:
                product = fetch_latest_product(client, site, 'dbzh')
            result.append(product)
        except Exception as e:
            traceback.print_exc()
            print(f'Failed to resolve latest product for site {site}, continuing...', file=sys.stderr)

    return result


def read_configuration(path):
    import configparser
    import io

    config = configparser.ConfigParser()
    config.read(path)
 
    get = lambda key: config.get("fmi_s3_product_download", key)

    return {
        "sites": [s.strip() for s in get("sites").split(',')],
        "side-length": int(get("side-length")),
        "output-directory": get("output-directory")
    }


def default(obj):
    """Default JSON serializer."""
    import calendar

    if isinstance(obj, dt):
        return obj.isoformat()
    else:
        raise Exception("Unknown type")


def main():
    from argparse import ArgumentParser

    parser = ArgumentParser()
    parser.add_argument("-d", "--dry-run", dest="dry_run", help="Don't actually download anything",
                        action="store_true", default=False)
    parser.add_argument("-c", "--config", dest="config", help="read configuration from FILE", metavar="FILE")
    args = parser.parse_args()

    try:
        configuration = read_configuration(args.config)
        print(configuration, file=sys.stderr)
    except:
        traceback.print_exc()
        print()
        print("Sample configuration:")
        print("---")
        print(sample_config)
        print("---")
        print("Note that the path above may not be correct - should most likely be the dir called data one dir above this script!")
        parser.error("Couldn't read configuration file passed in")

    products = fetch_product_list(sites=configuration['sites'])

    newest_products = {}
    for p in products:
        key = p.site, p.product, p.elevation
        newest_currently = newest_products.get(key)
        if newest_currently is None or newest_currently.time < p.time:
            newest_products[key] = p

    client = boto3.client('s3', config=Config(signature_version=UNSIGNED))

    for index, product in enumerate(newest_products.values()):
        if not args.dry_run:
            now = dt.now(datetime.UTC)
            dir_part = [configuration['output-directory'], str(now.year), str(now.month), str(now.day)]
            if not path_exists(path_join(*dir_part)):
                makedirs(path_join(*dir_part))

            json_dest_path = path_join(*(dir_part + [product.file_name() + ".json"]))
            orig_tiff_dest_path = path_join(*(dir_part + [product.file_name() + ".orig.tiff"]))
            reproj_tiff_dest_path = path_join(*(dir_part + [product.file_name() + ".tiff"]))

            if path_exists(json_dest_path):
                print("%s already exists, not downloading %s" % (json_dest_path, product.key),
                      file=sys.stderr)
            else:
                if path_exists(orig_tiff_dest_path):
                    unlink(orig_tiff_dest_path)
                with open(orig_tiff_dest_path, 'wb') as f:
                    client.download_fileobj(_product_bucket, product.key, f)
                print(orig_tiff_dest_path, file=sys.stderr)

                info = json.loads(subprocess.check_output([
                    'gdalinfo', '-json', orig_tiff_dest_path
                ]))
                sizes = info['size']
                min_dimension = min(sizes)
                desired_side_length = configuration['side-length']
                coef = desired_side_length / float(min_dimension)
                dims = [coef * size for size in sizes]

                subprocess.check_call([
                    'gdalwarp', '-overwrite', orig_tiff_dest_path, reproj_tiff_dest_path,
                    '-t_srs', 'EPSG:4326',
                    '-ts', str(int(dims[0])), str(int(dims[1])),
                    '-srcnodata', '255',
                    '-dstnodata', '0',
                    # https://lists.osgeo.org/pipermail/gdal-dev/2010-May/024553.html
                    '-wo', 'INIT_DEST=255'
                ], stdout=subprocess.DEVNULL) # gdalwarp produces debug output into stdout...
                unlink(orig_tiff_dest_path)
                print(reproj_tiff_dest_path, file=sys.stderr)
                print(reproj_tiff_dest_path)

                with open(json_dest_path, 'w', encoding='utf-8') as f:
                    json.dump(product.metadata(), f, default=default, ensure_ascii=False, indent=4)

        json.dump(product.metadata(), sys.stderr, default=default, ensure_ascii=False, indent=4)
        print(file=sys.stderr)
        print("%i/%i" % (index + 1, len(newest_products)), file=sys.stderr)


if __name__ == '__main__':
    main()
