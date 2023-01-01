#!/bin/bash

docker rm -f $(docker ps -aq)

# Start REDIS
docker run -d --name redis-test -p 6379:6379 redis:latest

# Start NATS server
docker run -d --name nats-test -p 4222:4222 nats:latest -js
pushd scanner/suumo
nats --server=nats://localhost:4222 stream add mystream --config ./stream-config.json
popd
pushd notification
nats --server=nats://localhost:4222 consumer add mystream --config setting/consumer-config.json
popd

# Start IMI server
pushd areaInfoMgr
docker build -f Dockerfile-imi -t imi-server .
popd
docker run -d --name imi-server-test -p 8080:8080 imi-server


