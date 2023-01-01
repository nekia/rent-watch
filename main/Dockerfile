FROM node:12.22.11

COPY . /usr/src/app
WORKDIR /usr/src/app

# 日本語対応
# RUN apt-get update && \
#     apt-get -y install locales fonts-ipafont fonts-ipaexfont && \
#     echo "ja_JP UTF-8" > /etc/locale.gen && locale-gen
    
# playwrightインストール
RUN npm i

# script実行
CMD bash -c "npm start"
