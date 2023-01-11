const nats = require('nats');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";

const siteName = process.env.WATCHING_SITE_NAME ? process.env.WATCHING_SITE_NAME : "HOMES";

let numRequest = 0;
let numResponse = 0;

(async () => {

  console.log(`Site-Name [${siteName}]`);

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });
  const jc = nats.JSONCodec();

  nc.publish("crawl-request", jc.encode({ siteName }));

  waitCrawlResp(nc);
  waitScanRespWithStream(nc);

  await nc.closed()
    .then((err) => {
      let m = `connection to ${nc.getServer()} closed`;
      if (err) {
        m = `${m} with an error: ${err.message}`;
      }
      console.log(m);
    });
})()

waitCrawlResp = async (nc) => {
  console.log("[Crawl Resp] Start waiting for response...")

  const jc = nats.JSONCodec();
  try {
    const subResp = nc.subscribe("crawl-response", { timeout: 600000 });

    for await (const msgCrawl of subResp) {
      const urlObj = jc.decode(msgCrawl.data);
      const url = urlObj.url;

      console.log(`[${subResp.getProcessed()}](crawl-response): ${url}`);
      numRequest++;
      nc.publish("scan-request", jc.encode({ siteName, url }));
    }
  } catch (error) {
    switch (error.code) {
      case nats.ErrorCode.Timeout:
        console.log("[Crawl Resp] subscription time-out")
        break;
      default:
        console.error("[Crawl Resp] handle error", error)
        break;
    }
    await nc.drain();
    await nc.close();
  }
  console.log("[Crawl Resp] subscription closed");
}

waitScanRespWithStream = async (nc) => {

  console.log("[Scan Resp] Start waiting for response...")

  const js = nc.jetstream();
  const jc = nats.JSONCodec();

  try {
    const subResp = nc.subscribe("scan-response", { timeout: 600000 });

    for await (const msgScan of subResp) {
      const detailObj = jc.decode(msgScan.data);
      const roomDetail = detailObj.roomDetail;

      console.log(`[${subResp.getProcessed()}](scan-response):`, { roomDetail });

      await js.publish("notify-request", jc.encode({ roomDetail }));
      numResponse++;
      if (numRequest == numResponse) {
        console.log("[Scan Resp] Completed to handle scan response", numRequest);
        await nc.drain()
        await nc.close()
        break;
      }
    }
  } catch (error) {
    switch (error.code) {
      case nats.ErrorCode.Timeout:
        console.log("[Scan Resp] subscription time-out")
        break;
      default:
        console.error("[Scan Resp] handle error", error)
        break;
    }
    await nc.drain()
    await nc.close()
  }

  console.log("[Scan Resp] subscription closed");
}