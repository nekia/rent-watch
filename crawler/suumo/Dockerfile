FROM mcr.microsoft.com/playwright:v1.20.2

COPY . /usr/src/app/
WORKDIR /usr/src/app

# playwrightインストール
RUN npm i

# script実行
CMD bash -c "npm start"
