#!/bin/bash

REDIS_SERVER_URL=redis://localhost:6379 \
NATS_SERVER_URL=localhost:4222 \
CACHE_MGR_URL=localhost:50051 \
AREA_INFO_MGR_URL=localhost:50052 \
ENABLE_NOTIFY=0 \
	node ./index.js
