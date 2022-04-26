const nats = require('nats');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";

(async () => {
  console.log('nats_server_url', nats_server_url)

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });

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

      if (url.includes("linea.co.jp")) {
        nc.publish("room-linea", sc.encode(url))
      } else if (url.includes("suumo.jp")) {
        nc.publish("room-suumo", sc.encode(url))
      } else if (url.includes("homes.co.jp")) {
        nc.publish("room-homes", sc.encode(url))
      }

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

