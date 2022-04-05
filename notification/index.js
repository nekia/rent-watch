const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');

const setting = require('../setting')
const utils = require('../utils')

const NOTIFIER_PROTO_PATH = __dirname + '/notification.proto';

const packageDefinition = protoLoader.loadSync(
  NOTIFIER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
const notifier_proto = grpc.loadPackageDefinition(packageDefinition).notification;

Notify = async (call, callback) => {
  const notifyRooms = call.request.rooms;
  for (let i = 0; i < notifyRooms.length && i < setting.MAX_NOTIFIES_AT_ONCE; i++) {
    const key = utils.createKeyFromDetail(notifyRooms[i])
    if (!await utils.checkCacheByKey(key)) {
      await utils.notifyLine(notifyRooms[i])
      console.log('Notified (Paased redundant check)', key)
    }
    await utils.addCache(notifyRooms[i], utils.CACHE_KEY_VAL_NOTIFIED)
  }
  callback(null, { status: "OK" });
};

function main() {
  const server = new grpc.Server();
  server.addService(notifier_proto.Notifier.service, { Notify });
  server.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
  });
}

main();
