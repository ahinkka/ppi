#!/bin/bash
exit 1 # needs to be configured

set -euo pipefail
# CODE_ROOT="$HOME/Projects/observer"

# First download
pushd "$CODE_ROOT/fmi/downloader" > /dev/null

env/bin/python fmi_product_download.py -c config.ini | \
while read f
do
  echo "Compressing \"$f\"..." >&2
  gzip "$f"
  echo "Compressed \"$f\"." >&2
done

popd > /dev/null

# Then cleanup
find "$CODE_ROOT/fmi/downloader/data" -mmin +1440 -delete
