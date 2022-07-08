#!/bin/bash

docker run --rm -i -v $(pwd)/../protobuf:/protos --rm fullstorydev/grpcurl -plaintext -d @ -import-path /protos -proto areaInfoMgr.proto host.docker.internal:50051 areaInfoMgr.areaInfoMgr/GetRank < ./test-input-GetRank.json

# docker run --rm -i -v $(pwd)/../protobuf:/protos --rm fullstorydev/grpcurl -plaintext -d @ -import-path /protos -proto areaInfoMgr.proto host.docker.internal:50051 areaInfoMgr.areaInfoMgr/GetRank < ./test-input-GetRank.json

