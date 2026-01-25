#!/bin/bash

script_dir=$(dirname "$(readlink -f "$0")")
pushd $script_dir

pushd fmi/s3_downloader
./download.sh
popd

./build-and-distribute.sh
