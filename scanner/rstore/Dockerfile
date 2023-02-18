FROM 192.168.0.133:30007/pwbase:1.0.0

COPY ./scanner/rstore /usr/src/app/
WORKDIR /usr/src/app/

# playwrightインストール
RUN npm i

# script実行
CMD bash -c "npm start"
