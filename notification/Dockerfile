FROM node:12.22.11

COPY . /usr/src/app/
WORKDIR /usr/src/app

RUN arch=$(arch | sed s/aarch64/arm64/ | sed s/x86_64/amd64/) && \
    wget "https://github.com/nats-io/natscli/releases/download/v0.0.30/nats-0.0.30-${arch}.deb" && \
    apt-get install ./nats-0.0.30-${arch}.deb

RUN npm i

CMD \
    nats --server=nats://nats-server:4222 stream add mystream --config setting/stream-config.json; \
    nats --server=nats://nats-server:4222 consumer add mystream --config setting/consumer-config.json; \
    bash -c "npm start"
