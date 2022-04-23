#!/bin/bash

docker run --rm -i -v $(pwd)/../protobuf:/protos --rm fullstorydev/grpcurl -plaintext -d @ -import-path /protos -proto cacheMgr.proto host.docker.internal:50051 cacheMgr.CacheMgr/CheckCacheByUrl < ./test-input-CheckCacheByUrl.json

# docker run --rm -i -v $(pwd)/../protobuf:/protos --rm fullstorydev/grpcurl -plaintext -d @ -import-path /protos -proto cacheMgr.proto host.docker.internal:50051 cacheMgr.CacheMgr/AddCache < ./test-input-AddCache.json
