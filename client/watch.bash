#!/usr/bin/env bash

find www css -type f | entr make html styles &
ENTR_PID=$!
echo "# HTML and styles build running in PID $ENTR_PID" 1>&2

make bundle-and-serve-dev &
ESBUILD_PID=$!
echo "# bundle-and-serve running in PID $ESBUILD_PID" 1>&2

# Terminate the processes on exit
trap "{ kill -9 $ENTR_PID $ESBUILD_PID; }" EXIT

# Wait for any one of the processes to terminate
wait -n $ENTR_PID $ESBUILD_PID
