const nats = require('nats');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";

(async () => {
  // console.log('nats_server_url', nats_server_url)

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });
  const js = nc.jetstream();

  if (process.argv.length != 3) {
    console.error("Need to specify site-name", process. process.argv)
    nc.close()
    return;
  }

  const siteName = process.argv[2];
  console.log(`Site-Name [${siteName}]`);

  nc.publish("crawl-request", jc.encode({ siteName }) );

  const subCrawlResp = nc.subscribe("crawl-response");
  waitCrawlResp(js, subCrawlResp);

  const subScanResp = nc.subscribe("scan-response");
  waitScanResp(js, subScanResp)
})()

waitCrawlResp = async (js, subResp) => {
  console.log("[Crawl Resp] Start waiting for response...")
  const jc = nats.JSONCodec();
  for await (const msgCrawl of subResp) {
    const urlObj = jc.decode(msgCrawl.data);
    const url = urlObj.url;

    console.log(`[${subResp.getProcessed()}](crawl-response): ${url}`);
    nc.publish("scan-request", jc.encode({ siteName, url }));
  }
  console.log("[Crawl Resp] subscription closed");
}

waitScanResp = async (js, subResp) => {
  console.log("[Scan Resp] Start waiting for response...")
  const jc = nats.JSONCodec();
  for await (const msgScan of subResp) {
    const detailObj = jc.decode(msgScan.data);
    const roomDetail = detailObj.roomDetail;
    console.log(`[${subResp.getProcessed()}](scan-response):`, {roomDetail} );
    js.publish("notify-request", jc.encode({ roomDetail }));
  }
  console.log("[Scan Resp] subscription closed");
}
