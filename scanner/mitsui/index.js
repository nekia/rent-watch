const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const nats_subject_roomurl = process.env.NATS_SUBJECT_ROOMURL ? process.env.NATS_SUBJECT_ROOMURL : "room-mitsui-tky-rent";
const nats_subject_roomdetail = process.env.NATS_SUBJECT_ROOMDETAIL ? process.env.NATS_SUBJECT_ROOMDETAIL : "roomdetails-tky-rent";

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

scanRoomDetail = async (address) => {
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await getNewContext(browser);
  const roomPage = await getNewPage(context);
  let price = 0.0, size = 0.0, floorLevel = {}, location = "", builtYear = 0;
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    price = await getPriceFloat(roomPage)
    size = await getSizeFloat(roomPage)
    floorLevel = await getFloorLevel(roomPage)
    location = await getLocation(roomPage)
    builtYear = await getBuiltYear(roomPage)
  } catch (error) {
    console.warn('## Failed to retrieve the detail ##', address, error)
  }
  await roomPage.close()
  await browser.close();
  return { address, price, size, floorLevel, location, builtYear }
}

getPriceFloat = async (page) => {
  const priceStr = await page.$('//ul[contains(@class, "tblBCmn") and contains(@class, "listRoom")]//li[contains(@class, "rent")]').then((elm) => elm.innerText())
  const priceNoUnit = priceStr.match(/[\d,]+/);
  return parseInt(priceNoUnit[0].replace(/,/g, ''))/10000
}

getSizeFloat = async (page) => {
  const roomSizeStr = await page.$('//dl[contains(@class, "square")]/dd/span[contains(@class, "sqm")]')
    .then( elm => elm.innerText() )
    .then( str => str.match(/[\d.]+/))
  return parseFloat(roomSizeStr[0])
}

getFloorLevel = async (page) => {
  const floorLevel = await page.$('//header/h2')
    .then((elm) => elm.innerText())
    .then((str) => str.match(/([\d]+)階/))

  const floorTopLevel = await page.$('//dt[text()[contains(., "規模構造")]]/following-sibling::dd[1]')
    .then((elm) => elm.innerText())
    .then((str) => str.match(/地上([\d]+)階/))

  return { floorLevel: parseInt(floorLevel[1]), floorTopLevel: parseInt(floorTopLevel[1]) }
}

getLocation = async (page) => {
  const addressStr = await page.$('//dl[contains(@class, "access")]//li[contains(@class, "addr")]')
    .then( elm => elm.innerText() )
    .then( str => str.trim() )
  return addressStr
}

getBuiltYear = async (page) => {
  return page.$('//dl[@class="estb"]/dd')
    .then( elm => elm.innerText() )
    .then( str => {
      const builtYrStr = str.match(/(\d+)年/)
      return parseInt(builtYrStr[1])
    })
}

(async () => {
  const app = express();
  const router = express.Router();

  router.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET');
    next();
  });

  router.get('/health', (req, res) => {
    const data = {
      uptime: process.uptime(),
      message: 'Ok',
      date: new Date()
    }
  
    res.status(200).send(data);
  });

  app.use('/api/v1', router);

  const server = http.createServer(app);
  server.listen(3000);

  const nc = await nats.connect({ servers: nats_server_url });
  const js = nc.jetstream();

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();
  // create a simple subscriber and iterate over messages
  // matching the subscription
  const sub = nc.subscribe(nats_subject_roomurl, { queue: "room" });
  (async () => {
    for await (const m of sub) {
      const address = sc.decode(m.data);
      console.log(`[${sub.getProcessed()}]: ${address}`);

      const detailObj = await scanRoomDetail(address);
      console.log(detailObj)
      js.publish(nats_subject_roomdetail, jc.encode(detailObj))
    }
    console.log("subscription closed");
  })();
})();
