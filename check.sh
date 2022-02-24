#!/bin/bash

echo "Start Watching Rent site!! -- `date`"

BASEDIR=$(dirname "$0")
pushd "$BASEDIR"
export LINE_NOTIFY_TOKEN=wBF5waxRFNbs2WgERTmpM5RkiWtXm5a1ufaSK16Xvo7
./check_in_docker.sh index-rnet.js
./check_in_docker.sh index-main.js
./check_in_docker.sh index-mitsui.js
./check_in_docker.sh index-linea.js
popd

echo "Finished Watching Rent site -- `date`"

