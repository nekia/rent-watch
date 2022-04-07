#!/bin/bash

docker run -i -v $(pwd)/notification:/protos --rm fullstorydev/grpcurl -plaintext -d @ -import-path /protos -proto notification.proto host.docker.internal:50052 notification.Notifier/Notify < ./test-input.json
