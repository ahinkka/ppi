#!/bin/bash
set -euo pipefail
# CODE_ROOT="$HOME/Projects/observer"

# First download
pushd "$CODE_ROOT/fmi/downloader" > /dev/null
set +u
source env/bin/activate
set -u
FILES=$(python fmi_product_download.py -c config.ini)
set +u
deactivate
set -u

# Then compress
for f in $FILES; do
    gzip $f
    echo "Compressed $f" >&2
done

popd > /dev/null
