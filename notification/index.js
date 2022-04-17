const utils = require('./utils')

const nats = require('nats');
// 定義ファイル(.protoファイル)の読み込み

const nats_server_name = process.env.NATS_SERVER_NAME ? process.env.NATS_SERVER_NAME : "127.0.0.1";

(async () => {

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: `${nats_server_name}:4222` });

  const js = nc.jetstream();

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();

  while (1) {
    let msgs = js.fetch("mystream", "myconsumer", { batch: 10, expires: 60000 });
    console.log('fetched')
    const done = (async () => {
      const roomsToBeNotified = [];
      for await (const m of msgs) {
        // do something with the message
        // and if the consumer is not set to auto-ack, ack!
        const detailObj = jc.decode(m.data)
        if (!detailObj) {
          console.log('Null')
          m.ack();
          continue
        }

        console.log(`[${msgs.getProcessed()}]:`, detailObj.address)
        if (await utils.meetCondition(detailObj)) {
          roomsToBeNotified.push(detailObj)
        }
        m.ack();
      }
      console.log('Completed fetch', roomsToBeNotified)
    })();

    // The iterator completed
    await done;
    console.log('Completed iteration')
  }

  utils.disconnectCache()
})()