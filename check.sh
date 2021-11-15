#!/bin/bash

echo "Start Watching Rent site!! -- `date`"

BASEDIR=$(dirname "$0")
pushd "$BASEDIR"
export LINE_NOTIFY_TOKEN=YOUR_LINE_NOTIFY_TOKEN_HERE
/usr/local/bin/node index.js
/usr/local/bin/node index-main.js
popd

echo "Finished Watching Rent site -- `date`"
