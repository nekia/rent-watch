const nats = require('nats');
const SCANNER_PROTO_PATH = __dirname + '/../protobuf/scanner.proto';
const NOTIFIER_PROTO_PATH = __dirname + '/../protobuf/notification.proto';

const grpc_scanner_name = process.env.GRPC_SCANNER_NAME ? process.env.GRPC_SCANNER_NAME : "127.0.0.1";
const nats_server_name = process.env.NATS_SERVER_NAME ? process.env.NATS_SERVER_NAME : "127.0.0.1";

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

const scanner_proto = grpc.loadPackageDefinition(packageDefinitionScanner).scanner;

(async () => {
  console.log('grpc_scanner_name', grpc_scanner_name)
  console.log('nats_server_name', nats_server_name)
  const clientScanner = new scanner_proto.Scanner(`${grpc_scanner_name}:50051`,
    grpc.credentials.createInsecure());

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: `${nats_server_name}:4222` });

  const js = nc.jetstream();

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();
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
      js.publish("roomdetails", jc.encode(detailObj))
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

