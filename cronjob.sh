#!/bin/bash

script_dir=$(dirname "$(readlink -f "$0")")
pushd $script_dir

pushd fmi/downloader
./download.sh
popd

./build-and-distribute.sh
