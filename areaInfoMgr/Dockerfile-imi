FROM node:12.22.11

WORKDIR /usr/src/app/

RUN wget https://info.gbiz.go.jp/tools/imi_tools/resource/imi-enrichment-address/imi-enrichment-address-2.0.0.tgz && \
    tar xf imi-enrichment-address-2.0.0.tgz

WORKDIR /usr/src/app/package
RUN npm i

EXPOSE 8080

CMD bash -c "npm start"
