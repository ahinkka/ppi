from __future__ import print_function

import argparse
import json
import os
import sys


def pr(*args, **kwargs):
    if kwargs.get('file', None) is None:
        kwargs['file'] = sys.stdout
    return print(*args, **kwargs)


def collect(infile):
    for line in infile:
        if line.startswith('#') or line.startswith('@'):
            continue
        lat, lon, place, name = line.replace('\n', '').split('\t')
        if place == 'town':
            yield {
                'lat': lat,
                'lon': lon,
                'name': name,
                'type': 'POINT OF INTEREST',
                'locality_type': 'town',
            }
        elif place == 'city':
            yield {
                'lat': lat,
                'lon': lon,
                'name': name,
                'type': 'POINT OF INTEREST',
                'locality_type': 'city',
            }
        else:
            raise Exception(f'unknown place type: {place}')


if __name__ == '__main__':
    from argparse import ArgumentParser

    parser = ArgumentParser()
    parser.add_argument('infile', nargs='?', type=argparse.FileType('r'),
                        default=sys.stdin,
                        help="CSV input file")
    args = parser.parse_args()
    for d in collect(args.infile):
        pr(json.dumps(d))
