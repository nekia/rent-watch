#!/bin/bash

echo "Start Watching Rent site!! -- `date`"
LINE_NOTIFY_TOKEN=${LINE_NOTIFY_TOKEN:-undefined}
if [ $LINE_NOTIFY_TOKEN == 'undefined' ]; then
  echo 'Need to define LINE_NOTIFY_TOKEN'
  exit 1
fi

BASEDIR=$(dirname "$0")
pushd "$BASEDIR"

./check_in_docker.sh index-rnet.js
./check_in_docker.sh index-main.js
./check_in_docker.sh index-linea.js
./check_in_docker.sh index-mitsui.js
popd

echo "Finished Watching Rent site -- `date`"

