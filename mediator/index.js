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
      const urlObj = jc.decode(m.data);
      console.log(urlObj)
      const url = urlObj.url;
      const mode = urlObj.mode;

      console.log(`[${sub.getProcessed()}]: ${mode} : ${url} `);

      if (url.includes("linea.co.jp")) {
        nc.publish(`room-linea-${mode}`, sc.encode(url))
      } else if (url.includes("suumo.jp")) {
        nc.publish(`room-suumo-${mode}`, sc.encode(url))
      } else if (url.includes("homes.co.jp")) {
        nc.publish(`room-homes-${mode}`, sc.encode(url))
      } else if (url.includes("r-store.jp")) {
        nc.publish(`room-rstore-${mode}`, sc.encode(url))
      } else if (url.includes("goodrooms.jp")) {
        nc.publish(`room-goodrooms-${mode}`, sc.encode(url))
      } else if (url.includes("mitsui-chintai.co.jp")) {
        nc.publish(`room-mitsui-${mode}`, sc.encode(url))
      } else if (url.includes("rnt.co.jp")) {
        nc.publish(`room-rnet-${mode}`, sc.encode(url))
      } else if (url.includes("kencorp.co.jp")) {
        nc.publish(`room-ken-${mode}`, sc.encode(url))
      } else if (url.includes("bluestudio.jp")) {
        nc.publish(`room-bs-${mode}`, sc.encode(url))
      } else if (url.includes("tokyo-designers.com")) {
        nc.publish(`room-td-${mode}`, sc.encode(url))
      } else if (url.includes("t-p-o.com")) {
        nc.publish(`room-tpo-${mode}`, sc.encode(url))
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

