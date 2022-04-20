const nats = require('nats');

const nats_server_name = process.env.NATS_SERVER_NAME ? process.env.NATS_SERVER_NAME : "127.0.0.1";

(async () => {
  console.log('nats_server_name', nats_server_name)

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

      nc.publish("room-linea", sc.encode(url))
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

