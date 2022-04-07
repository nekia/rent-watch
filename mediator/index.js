const nats = require('nats');
const SCANNER_PROTO_PATH = __dirname + '/../scanroom/scanroom.proto';
const NOTIFIER_PROTO_PATH = __dirname + '/../notification/notification.proto';

const grpc = require('@grpc/grpc-js');
// 定義ファイル(.protoファイル)の読み込み
const protoLoader = require('@grpc/proto-loader');
const packageDefinitionScanner = protoLoader.loadSync(
  SCANNER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const packageDefinitionNotifier = protoLoader.loadSync(
  NOTIFIER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const scanner_proto = grpc.loadPackageDefinition(packageDefinitionScanner).scanroom;
const notifier_proto = grpc.loadPackageDefinition(packageDefinitionNotifier).notification;

(async () => {

  const clientScanner = new scanner_proto.Scanner('127.0.0.1:50051',
    grpc.credentials.createInsecure());
  const clientNotifier = new notifier_proto.Notifier('127.0.0.1:50052',
    grpc.credentials.createInsecure());

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: "localhost:4222" });

  // create a codec
  const sc = nats.StringCodec();
  // create a simple subscriber and iterate over messages
  // matching the subscription
  const sub = nc.subscribe("rooms");
  (async () => {
    for await (const m of sub) {
      console.log(`[${sub.getProcessed()}]: ${sc.decode(m.data)}`);
      const url = sc.decode(m.data);
      // if (await utils.checkCacheByUrl(url)) {
      //   continue
      // }

      const detailObj = await new Promise((resolv, reject) => {
        clientScanner.ScanRoomDetail({ url }, function(err, response) {
          resolv(response)
        });
      });
      console.log(detailObj)
      // if (detailObj.location.length == 0) {
      //   continue;
      // }
      // if (await utils.meetCondition(detailObj)) {
      //   notifys.push(detailObj)
      // } else {
      //   await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
      // }

      // const response = await new Promise((resolv, reject) => {
      //   clientNotifier.Notify( { rooms: notifyRooms }, function(err, response) {
      //     console.log('Completed Notify', response.status)
      //     resolv(response)
      //   });
      // })
    }
    console.log("subscription closed");
  })();
})()

