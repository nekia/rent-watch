FROM node:14

COPY ./areaInfoMgr/ /usr/src/app/
WORKDIR /usr/src/app

RUN npm i

EXPOSE 50051

CMD bash -c "npm start"
