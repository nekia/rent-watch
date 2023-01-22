FROM node:14 as build

COPY ./main /usr/src/app
WORKDIR /usr/src/app

# playwrightインストール
RUN npm i

# script実行
CMD bash -c "npm start"
