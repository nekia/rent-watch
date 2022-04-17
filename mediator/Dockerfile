FROM node:12.22.11

COPY scanner/linea/protobuf/scanner.proto /usr/src/app/protobuf/scanner.proto
COPY notification/protobuf/notification.proto /usr/src/app/protobuf/notification.proto
COPY mediator /usr/src/app/mediator
WORKDIR /usr/src/app/mediator

RUN arch=$(arch | sed s/aarch64/arm64/ | sed s/x86_64/amd64/) && \
    wget "https://github.com/nats-io/natscli/releases/download/v0.0.30/nats-0.0.30-${arch}.deb" && \
    apt-get install /usr/src/app/mediator/nats-0.0.30-${arch}.deb

# 日本語対応
# RUN apt-get update && \
#     apt-get -y install locales fonts-ipafont fonts-ipaexfont && \
#     echo "ja_JP UTF-8" > /etc/locale.gen && locale-gen
    
# playwrightインストール
RUN npm i

# script実行
CMD nats --server=nats://nats-server:4222 stream add mystream --config stream-config.json; bash -c "npm start"
