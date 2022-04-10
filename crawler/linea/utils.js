const nats = require('nats');

openNConn = () => {
  // to create a connection to a nats-server:
  return nats.connect({ servers: "host.docker.internal:4222" });
}

publishRoom = (nc, url) => {
  const sc = nats.StringCodec();
  nc.publish("rooms", sc.encode(url));
}

closeNConn = async (nc) => {
  await nc.drain()
}

getNewContext = async (browser) => {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4595.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  await ctx.setDefaultTimeout(60000)
  return ctx;
}

getNewPage = async (context) => {
  return context.newPage()
}

module.exports = {
  getNewContext,
  getNewPage,
  openNConn,
  publishRoom,
  closeNConn,
};
