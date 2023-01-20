FROM node:14 as build
RUN mkdir -p /usr/src/app/protobuf
COPY ./protobuf/cacheMgr.proto /usr/src/app/protobuf
COPY ./protobuf/roomdetail.proto /usr/src/app/protobuf
COPY ./protobuf/areaInfoMgr.proto /usr/src/app/protobuf

WORKDIR /usr/src/app
RUN npm install grpc-tools protoc
RUN mkdir generated
RUN node_modules/.bin/grpc_tools_node_protoc --js_out=import_style=commonjs,binary:generated \
		--grpc_out=grpc_js:generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto ./protobuf/roomdetail.proto \
		./protobuf/areaInfoMgr.proto

FROM node:14

COPY ./notifier /usr/src/app/
WORKDIR /usr/src/app
RUN mkdir generated
COPY --from=build /usr/src/app/generated ./generated

RUN arch=$(arch | sed s/aarch64/arm64/ | sed s/x86_64/amd64/) && \
    wget "https://github.com/nats-io/natscli/releases/download/v0.0.30/nats-0.0.30-${arch}.deb" && \
    apt-get install ./nats-0.0.30-${arch}.deb

RUN npm i

CMD \
    nats --server=nats://nats-server:4222 stream add mystream --config setting/stream-config.json; \
    nats --server=nats://nats-server:4222 consumer add mystream --config setting/consumer-config.json; \
    bash -c "npm start"
