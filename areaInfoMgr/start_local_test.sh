#!/bin/bash

# rm -f all2*
# wget -O all2-sjis.csv https://www.toshiseibi.metro.tokyo.lg.jp/bosai/chousa_6/download/all2.csv
# iconv -f SHIFT-JIS -t UTF-8 all2-sjis.csv -o all2.csv
# REDIS_SERVER_URL=redis://localhost:6379 \
#   node ./import_csv.js

REDIS_SERVER_URL=redis://localhost:6379 \
IMI_SERVER_URL=http://localhost:8080 \
GRPC_SERVICE_AREA_INFO_PORT=50052 \
  node ./index.js
