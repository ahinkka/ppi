#!/bin/bash
exit 1 # needs to be configured

set -euo pipefail
# CODE_ROOT="$HOME/Projects/ppi"
# WWW_ROOT="/dev/null"

# Create an updated distribution
(python3 fmi/dist_builder/collect_radar_products.py fmi/downloader/data ;
 python3 finnish_localities/collect_localities.py finnish_localities/finnish_localities.csv) | \
	python3 collect.py fmi/dist_builder/raster_to_json/target/release/raster_to_json dist

# Remove old files
find dist -mmin +1440 -delete

# Set proper permissions
find dist -exec chmod 777 {} \;

# First sync everything but the catalog so that we can atomically switch the catalog
rsync -a dist/ "${WWW_ROOT}/data/" --exclude 'catalog.json'

# Switch the catalog
cp dist/catalog.json "${WWW_ROOT}/data/"

# Do a second sync; this should get rid of the old files in the dest as well
rsync -a -delete dist/ "${WWW_ROOT}/data/"
