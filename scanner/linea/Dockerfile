FROM mcr.microsoft.com/playwright:v1.20.2

COPY . /usr/src/app/scanner
WORKDIR /usr/src/app/scanner

# 日本語対応
# RUN apt-get update && \
#     apt-get -y install locales fonts-ipafont fonts-ipaexfont && \
#     echo "ja_JP UTF-8" > /etc/locale.gen && locale-gen
    
# playwrightインストール
RUN npm i

# script実行
CMD bash -c "npm start"
