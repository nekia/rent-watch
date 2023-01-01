#!/bin/bash

REDIS_SERVER_URL=redis://localhost:6379 \
IMI_SERVER_URL=http://localhost:8080 \
GRPC_SERVICE_AREA_INFO_PORT=50052 \
node ./index.js
