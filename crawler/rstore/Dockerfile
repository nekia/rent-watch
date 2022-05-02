FROM 192.168.2.133:32608/pwbase:1.0.0

COPY . /usr/src/app/
WORKDIR /usr/src/app

# playwrightインストール
RUN npm i

# script実行
CMD bash -c "npm start"
