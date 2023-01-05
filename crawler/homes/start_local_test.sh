#!/bin/bash

REDIS_SERVER_URL=redis://localhost:6379 \
CACHE_MGR_URL=localhost:50051 \
	node ./index.js
