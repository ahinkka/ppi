import datetime
import json
import operator
import os
import subprocess
import sys
import traceback
import dataclasses
import typing

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
    'fikau': 'Inari Kaunispää',
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
    'finrad': 'Finland composite',
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


@dataclasses.dataclass
class LinearDataScale:
    linear_transformation_gain: float
    linear_transformation_offset: float


@dataclasses.dataclass
class HydroClassDataScale:
    no_signal: int
    non_met: int
    rain: int
    wet_snow: int
    dry_snow: int
    graupel: int
    hail: int


# https://en.ilmatieteenlaitos.fi/radar-data-on-aws-s3
# radar reflectivity (dbz), conversion: Z[dBZ] = 0.5 * pixel value - 32
_dbzh_datascale = LinearDataScale(
    linear_transformation_gain=0.5,
    linear_transformation_offset=-32
)


# rain classification (hclass), conversion: 0=no signal, 1=non met, 2=rain, 3=wet snow, 4=dry snow, 5=graupel, 6=hail
_hclass_datascale = HydroClassDataScale(
    no_signal=0,
    non_met=1,
    rain=2,
    wet_snow=3,
    dry_snow=4,
    graupel=5,
    hail=6
)


@dataclasses.dataclass
class Product:
    """Parsed radar product structure for radar radar product files in S3.

    Given product names like:
    202601240000_fikau_cappi_600_dbzh_qc.tif
    202601240000_fikau_ppi_0.3_dbzh_qc.tif
    202601240000_fikau_ppi_0.7_dbzh_qc.tif
    202601240000_fikau_ppi_0.3_hclass_qc.tif
    202601240000_fikau_ppi_0.3_vrad_qc.tif
    202601240000_fikau_etop_-10_dbzh_qc.tif
    202601240000_fikau_etop_20_dbzh_qc.tif
    202601240000_fikau_etop_45_dbzh_qc.tif
    202601240000_fikau_etop_50_dbzh_qc.tif
    202601240000_composite_cappi_600_dbzh_finrad_qc.tif
    202601240000_composite_cappi_600_acrr1h_finradfast_qc.tif
    202601240000_composite_cappi_600_acrr3h_finradfast_qc.tif
    202601240000_composite_cappi_600_acrr6h_finradfast_qc.tif
    202601240000_composite_cappi_600_acrr12h_finradfast_qc.tif
    202601240000_composite_cappi_600_acrr24h_finradfast_qc.tif

    See docs at https://en.ilmatieteenlaitos.fi/radar-data-on-aws-s3 and
    view file listings at e.g. http://fmi-opendata-radar-geotiff.s3-website-eu-west-1.amazonaws.com/?prefix=2026/01/24/.
    """
    timestamp: dt
    filename: str
    site: str             # fikau / finrad / finradfast
    product_type: str     # PPI dbZh / CAPPI dbZh / PPI hclass / ETOP dbZh / ACRR mm
    product_subtype: str  # EL 0.3°, EL 0.7° / H 600 m / THR 20, THR 40 / 1h, 3h
    data_type: str        # Z / hclass / rr
    data_unit: str        # dbZ / hclass / mm
    height: float         # CAPPI height
    elevation: float      # PPI sweep elevation
    # How integer numbers are translated into actual values.
    data_scale: typing.Union[LinearDataScale, HydroClassDataScale]
    composite: bool       # Is this a composite product, i.e. not a single radar.

    @staticmethod
    def _normalize_data_type(raw_datatype: str) -> str:
        """Convert raw datatype string to normalized data_type.
        Examples: 'dbzh' -> 'Z', 'hclass' -> 'hclass', 'vrad' -> 'V', 'acrr' -> 'rr'
        """
        mapping = {
            'dbzh': 'Z',
            'hclass': 'hclass',
            'vrad': 'V',
            'acrr': 'rr'
        }
        return mapping.get(raw_datatype, raw_datatype)

    @staticmethod
    def _resolve_data_unit(data_type: str) -> str:
        """Get data unit from normalized data_type.
        Examples: 'Z' -> 'dbZ', 'hclass' -> 'hclass', 'V' -> 'm/s', 'rr' -> 'mm'
        """
        mapping = {
            'Z': 'dbZ',
            'hclass': 'hclass',
            'V': 'm/s',
            'rr': 'mm'
        }
        return mapping.get(data_type, data_type)

    @staticmethod
    def from_filename(filename):
        filename_without_extension = '.'.join(filename.split('.')[:-1])
        parts = filename_without_extension.split('_')

        timestamp_part = parts[0]
        parsed_dt = dt.strptime(timestamp_part, '%Y%m%d%H%M')
        if not parsed_dt.tzinfo:
            parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)

        # Initialize all optional fields to None
        data_type = None
        data_unit = None
        height = None
        elevation = None
        data_scale = None
        composite = None

        if 'composite' in filename:
            site = parts[5]
            composite = True

            if 'composite_cappi' in filename and 'acrr' in filename:
                # 202601240000_composite_cappi_600_acrr1h_finradfast_qc.tif
                datatype_part = parts[4]
                duration = datatype_part.replace('acrr', '')
                product_type = "ACRR mm"
                product_subtype = duration
                height = float(parts[3])
                data_type = 'rr'
                data_unit = 'mm'
            elif 'composite_cappi' in filename and 'dbzh' in filename:
                # 202601240000_composite_cappi_600_dbzh_finrad_qc.tif
                height = float(parts[3])
                product_type = "CAPPI dbZh"
                product_subtype = f"H {int(height)} m"
                data_type = 'Z'
                data_unit = 'dbZ'
            else:
                raise ValueError(f"Unhandled composite product filename: {filename=}")
        else:
            site = parts[1]
            product = parts[2]
            value = parts[3]
            datatype = parts[4]
            composite = False

            if product == "ppi":
                # 202601240000_fikau_ppi_0.3_dbzh_qc.tif
                product_type = f"PPI {datatype.replace('dbzh', 'dbZh')}"
                product_subtype = f"EL {value}°"
                elevation = float(value)
                data_type = Product._normalize_data_type(datatype)
                data_unit = Product._resolve_data_unit(data_type)
            elif product == "cappi":
                # 202601240000_fikau_cappi_600_dbzh_qc.tif
                height = float(value)
                product_type = f"CAPPI {datatype.replace('dbzh', 'dbZh')}"
                product_subtype = f"H {int(height)} m"
                data_type = Product._normalize_data_type(datatype)
                data_unit = Product._resolve_data_unit(data_type)
            elif product == "etop":
                # 202601240000_fikau_etop_-10_dbzh_qc.tif
                product_type = f"ETOP"
                product_subtype = f"THR {value}"
                data_type = "height"
                data_unit = "km"
            else:
                raise ValueError(f"Unhandled non-composite product filename: {filename=}")

        if data_unit == 'dbZ':
            data_scale = _dbzh_datascale
        elif data_unit == 'hclass':
            data_scale = _hclass_datascale

        return Product(
            timestamp=parsed_dt,
            filename=filename,
            site=site,
            product_type=product_type,
            product_subtype=product_subtype,
            data_type=data_type,
            data_unit=data_unit,
            height=height,
            elevation=elevation,
            data_scale=data_scale,
            composite=composite
        )

    def as_dict(self):
        result = dataclasses.asdict(self)
        if self.data_scale is not None:
            result['data_scale'] = dataclasses.asdict(self.data_scale)
        del result['filename']
        return result

    def extensionless_filename(self):
        return '.'.join(self.filename.split('.')[:-1])


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


def fetch_product_list(sites=DEFAULT_SITES):
    client = boto3.client('s3', config=Config(signature_version=UNSIGNED))

    result = []
    for site in sites:
        try:
            date_prefix = dt.now(datetime.UTC).strftime('%Y/%m/%d')
            prefix = f'{date_prefix}/{site}/'
            raw_entries = list_objects(client, _product_bucket, prefix)

            entries_by_filename = { entry['Key'].split('/')[-1]: entry['Key'] for entry in raw_entries }
            entries = { p: Product.from_filename(p) for p in entries_by_filename.keys() }

            supported_data_scale = [p for p in entries.values() if p.data_scale is not None]

            # Collect PPIs
            desired_elevations = sorted(list(set([p.elevation for p in supported_data_scale if p.elevation])))
            for elevation in desired_elevations:
                elevation_ppis = [p for p in supported_data_scale if p.elevation == elevation]
                unique_data_types = set([p.data_type for p in elevation_ppis])
                for data_type in unique_data_types:
                    latest = sorted(
                        [p for p in elevation_ppis if p.data_type == data_type],
                        key=lambda e: e.timestamp,
                        reverse=True
                    )[0]
                    s3_key = entries_by_filename[latest.filename]
                    result.append([s3_key, latest])

            # Collect CAPPIs
            desired_heights = sorted(list(set([p.height for p in supported_data_scale if p.height])))
            for height in desired_heights:
                height_cappis = [p for p in supported_data_scale if p.height == height]
                latest = sorted(height_cappis, key=lambda e: e.timestamp, reverse=True)[0]
                s3_key = entries_by_filename[latest.filename]
                result.append([s3_key, latest])

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


def download(dry_run, configuration):
    s3_keys_and_products = fetch_product_list(sites=configuration['sites'])

    newest_products = {}
    for [s3_key, p] in s3_keys_and_products:
        key = p.site, p.product_type, p.product_subtype
        _, newest_currently = newest_products.get(key, [None, None])
        if newest_currently is None or newest_currently.timestamp < p.timestamp:
            newest_products[key] = [s3_key, p]

    client = boto3.client('s3', config=Config(signature_version=UNSIGNED))

    for index, s3_key_and_product in enumerate(newest_products.values()):
        s3_key, product = s3_key_and_product
        if not dry_run:
            now = dt.now(datetime.UTC)
            dir_part = [configuration['output-directory'], str(now.year), str(now.month), str(now.day)]
            if not path_exists(path_join(*dir_part)):
                makedirs(path_join(*dir_part))

            json_dest_path = path_join(*(dir_part + [product.extensionless_filename() + ".json"]))
            orig_tiff_dest_path = path_join(*(dir_part + [product.extensionless_filename() + ".orig.tiff"]))
            reproj_tiff_dest_path = path_join(*(dir_part + [product.extensionless_filename() + ".tiff"]))

            if path_exists(json_dest_path):
                print("%s already exists, not downloading %s" % (json_dest_path, s3_key),
                      file=sys.stderr)
            else:
                if path_exists(orig_tiff_dest_path):
                    unlink(orig_tiff_dest_path)
                with open(orig_tiff_dest_path, 'wb') as f:
                    client.download_fileobj(_product_bucket, s3_key, f)
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
                    json.dump(product.as_dict(), f, default=default, ensure_ascii=False, indent=4)

        json.dump(product.as_dict(), sys.stderr, default=default, ensure_ascii=False, indent=4)
        print(file=sys.stderr)
        print("%i/%i" % (index + 1, len(newest_products)), file=sys.stderr)


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

    download(args.dry_run, configuration)

if __name__ == '__main__':
    main()
