#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

# Reverse alphabetically ordered (release before debug)
RASTER_TO_JSON=$(find "${SCRIPT_DIR}/fmi/dist_builder/raster_to_json" -maxdepth 3 -name 'raster_to_json' -type f -print | sort -r | head -1)

if [[ ! -f "${RASTER_TO_JSON}" ]] ; then
    echo "raster_to_json executable does not exist! See ${SCRIPT_DIR}/fmi/dist_builder/raster_to_json/README.md for build instructions." >&2
    exit 1
fi

python3 fmi/dist_builder/collect_radar_products.py fmi/data/ | \
    python3 collect.py "$RASTER_TO_JSON" client/build/data

python3 finnish_localities/localities_to_geojson.py finnish_localities/finnish_localities.tsv > client/build/data/geointerests.geojson
