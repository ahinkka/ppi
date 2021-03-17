from __future__ import print_function

import argparse
import json
import sys


def pr(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = sys.stdout
    return print(*args, **kwargs)


def collect_features(infile):
    for line in infile:
        if line.startswith('#') or line.startswith('@'):
            continue
        lat, lon, place, name = line.replace('\n', '').split('\t')

        yield {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [float(lon), float(lat)]
            },
            'properties': {
                'name': name,
                'osmPlace': place,
            }
        }


if __name__ == '__main__':
    from argparse import ArgumentParser

    parser = ArgumentParser()
    parser.add_argument('infile', nargs='?', type=argparse.FileType('r'),
                        default=sys.stdin,
                        help="CSV input file")
    args = parser.parse_args()

    pr(json.dumps({
        'type': 'FeatureCollection',
        'features': list(collect_features(args.infile))
    }))
