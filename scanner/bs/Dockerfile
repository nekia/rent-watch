FROM 192.168.0.133:30007/pwbase:1.0.0

COPY . /usr/src/app/
WORKDIR /usr/src/app/

RUN arch=$(arch | sed s/aarch64/arm64/ | sed s/x86_64/amd64/) && \
    wget "https://github.com/nats-io/natscli/releases/download/v0.0.30/nats-0.0.30-${arch}.deb" && \
    apt-get install /usr/src/app/nats-0.0.30-${arch}.deb

# playwrightインストール
RUN npm i

# script実行
CMD nats --server=nats://nats-server:4222 stream add mystream --config stream-config.json; bash -c "npm start"
