import io
import os
import sys
import traceback
import urllib.parse
import urllib.request
import json
import subprocess

from os import getcwd, unlink, makedirs
from os.path import join as path_join
from os.path import exists as path_exists
from datetime import datetime as dt
from collections import namedtuple

import dateutil.parser
from owslib.wfs import WebFeatureService
from lxml import etree


DEFAULT_SITES = ['luosto', 'anjalankoski', 'ikaalinen', 'vimpeli', 'utajarvi',
                 'kuopio', 'vantaa', 'korpo', 'petajavesi', 'kesalahti', 'nurmes']


sample_config = """
[fmi_product_download]
sites = %s
output-directory = %s
""" % (", ".join(DEFAULT_SITES), os.getcwd())


def print_elem(e, level=0, recursive=True, first_child_only=False, file=sys.stdout):
    indent = ''
    for i in range(level):
        indent += '  '

    text = e.text
    if e.text is not None:
        text = e.text.strip()
    print(f'{indent}TAG:    {e.tag}', file=file)
    print(f'{indent}TEXT:   "{text}"', file=file)
    print(f'{indent}ATTRIB: {e.attrib}', file=file)

    if recursive:
        for c in e:
            print_elem(c, level + 1, recursive=recursive, first_child_only=first_child_only, file=file)

            if first_child_only:
                break


def first_child_by_tag(tag, e):
    try:
        return next(e.iter('{*}' + tag))
    except StopIteration:
        output = io.StringIO()
        print_elem(e, level=1, recursive=False, file=output)
        contents = output.getvalue()
        output.close()
        raise Exception(f'Child by tag {tag} not found from element {e}:\n{contents}')


def first_child_by_tag_path(tag_path, e):
    current = e
    for tag in tag_path:
        current = first_child_by_tag(tag, current)
    return current


def named_value_with_name_with_attrib_containing_substring(substring, e):
    for c in e.iter('{*}NamedValue'):
        name_e = first_child_by_tag('name', c)
        if any(substring in v for v in name_e.attrib.values()):
            return c


def ludicrous_named_value(attrib_value_substring, e):
    return first_child_by_tag(
        'Measure',
        named_value_with_name_with_attrib_containing_substring(attrib_value_substring, e))


class Product(object):
    def __init__(self, site, product, time, url, elevation=None,
                 linear_transformation_gain=None, linear_transformation_offset=None):
        self.site = site
        self.product = product
        self.time = time
        self.url = url
        self.elevation = elevation
        self.linear_transformation_gain = linear_transformation_gain
        self.linear_transformation_offset = linear_transformation_offset

    def file_name(self):
        if self.elevation:
            return u"{0}--{1}--{2}--{3}".format(self.site, self.product, self.elevation, self.time)
        else:
            return u"{0}--{1}--{2}".format(self.site, self.product, self.time)

    def metadata(self):
        return {
            'site': self.site,
            'product': self.product,
            'time': self.time,
            'elevation': self.elevation,
            'linear_transformation_gain': self.linear_transformation_gain,
            'linear_transformation_offset': self.linear_transformation_offset            
        }


def fetch_product_list(sites=DEFAULT_SITES):
    # Radar reflectivity (dbz) from single radars.
    # Possible query parameters:
    #     starttime
    #     endtime
    #     bbox
    #     elevation
    wfs = WebFeatureService(url='http://opendata.fmi.fi/wfs', version='2.0.0')
    resp = wfs.getfeature(storedQueryID='fmi::radar::single::dbz')
    contents = resp.read()
    tree = etree.fromstring(contents)

    result = []
    for e in tree.iter('{*}member'):
        # phenomenon_time = first_child_by_tag_path(['phenomenonTime', 'timePosition'], e).text
        # result_time = first_child_by_tag_path(['resultTime', 'timePosition'], e).text
        # bin_count = int(ludicrous_named_value('binCount', e).text)
        # bin_length = int(ludicrous_named_value('binLength', e).text)
        # elevation_angle = float(ludicrous_named_value('elevationAngle', e).text)

        errors = False
        try:
            linear_transformation_gain = float(ludicrous_named_value('linearTransformationGain', e).text)
            linear_transformation_offset = float(ludicrous_named_value('linearTransformationOffset', e).text)
        except:
            errors = True

        url = first_child_by_tag('fileReference', e).text

        params = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)

        _, site_product = params['layers'][0].split(':')
        site, product_name = site_product.split('_')

        if site not in sites:
            continue

        image_format = params['format'][0]
        width = int(params['width'][0])
        height = int(params['height'][0])
        elevation_angle = float(params['elevation'][0])
        time = dateutil.parser.parse(params['time'][0])

        # first_child_by_tag(
        #     'Measure',
        #     named_value_with_name_with_attrib_containing_substring('elevationAngle', e)).text

        # bin_count = first_child_by_tag(
        #     'Measure',
        #     named_value_with_name_with_attrib_containing_substring('binCount', e)).text

        # print(params)

        if errors:
            print_elem(e, recursive=True)
            sys.exit(1)

        product = Product(site, product_name, time, url, elevation=elevation_angle,
                          linear_transformation_gain=linear_transformation_gain,
                          linear_transformation_offset=linear_transformation_offset)
        result.append(product)

        # print_elem(e, recursive=True)
        # break

    return result


def read_configuration(path):
    import configparser
    import io

    config = configparser.ConfigParser()
    config.read(path)
    
    get = lambda key: config.get("fmi_product_download", key)

    return {
        "sites": [s.strip() for s in get("sites").split(',')],
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
        parser.error("Couldn't read configuration file passed in")

    products = fetch_product_list(sites=configuration['sites'])

    newest_products = {}
    for p in products:
        key = p.site, p.product, p.elevation
        newest_currently = newest_products.get(key)
        if newest_currently is None or newest_currently.time < p.time:
            newest_products[key] = p

    for index, product in enumerate(newest_products.values()):
        if not args.dry_run:
            now = dt.utcnow()
            dir_part = [configuration['output-directory'], str(now.year), str(now.month), str(now.day)]
            if not path_exists(path_join(*dir_part)):
                makedirs(path_join(*dir_part))

            json_dest_path = path_join(*(dir_part + [product.file_name() + ".json"]))
            orig_tiff_dest_path = path_join(*(dir_part + [product.file_name() + ".orig.tiff"]))
            reproj_tiff_dest_path = path_join(*(dir_part + [product.file_name() + ".tiff"]))

            if path_exists(json_dest_path):
                print("%s already exists, not downloading %s" % (json_dest_path, product.url),
                      file=sys.stderr)
            else:
                if path_exists(orig_tiff_dest_path):
                    unlink(orig_tiff_dest_path)
                urllib.request.urlretrieve(product.url, orig_tiff_dest_path)
                print(orig_tiff_dest_path, file=sys.stderr)
                subprocess.check_call([
                    'gdalwarp', '-overwrite', orig_tiff_dest_path, reproj_tiff_dest_path,
                    '-t_srs', 'EPSG:4326',
                    '-ts',  '1000', '1000',
                    '-srcnodata', '255',
                    '-dstnodata', '0',
                    # https://lists.osgeo.org/pipermail/gdal-dev/2010-May/024553.html
                    '-wo', 'INIT_DEST=255'
                ])
                print(reproj_tiff_dest_path, file=sys.stderr)
                unlink(orig_tiff_dest_path)

                with open(json_dest_path, 'w', encoding='utf-8') as f:
                    json.dump(product.metadata(), f, default=default, ensure_ascii=False, indent=4)

        json.dump(product.metadata(), sys.stderr, default=default, ensure_ascii=False, indent=4)
        print(file=sys.stderr)
        print("%i/%i" % (index + 1, len(newest_products)), file=sys.stderr)


if __name__ == '__main__':
    main()
