#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

pushd "${SCRIPT_DIR}" > /dev/null

env/bin/python fmi_s3_product_download.py -c config.ini | \
while read f
do
  echo "Compressing \"$f\"..." >&2
  gzip "$f"
  echo "Compressed \"$f\"." >&2
done

popd > /dev/null

# Then cleanup (needs to match what's in config.ini)
find "${SCRIPT_DIR}/../data" -mmin +1440 -delete
