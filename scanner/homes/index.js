const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const nats_subject_roomurl = process.env.NATS_SUBJECT_ROOMURL ? process.env.NATS_SUBJECT_ROOMURL : "room-homes-tky-rent";
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
  const roomPriceElm = await page.$('//th[text()[contains(., "賃料（管理費等）")]]/following-sibling::td/div/div[1]/span/span')
  const priceStr = await roomPriceElm.innerText();
  const priceWoUnit = priceStr.match(/[\d.]+/);
  return parseFloat(priceWoUnit[0])
}

getSizeFloat = async (page) => {
  const roomSizeElm = await page.$('//span[text()[contains(., "専有面積")]]/parent::*/following-sibling::dd[1]')
  const roomSizeStr = await roomSizeElm.innerText()
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return parseFloat(roomSizeNoUnit[0])
}

getFloorLevel = async (page) => {
  // 所在階 / 階数 | 2階 / 12階建 (地下1階)
  const floorLevel = await page.$('//th[text()[contains(., "所在階 / 階数")]]/following-sibling::td[1]')
  const floorLevelStr = await floorLevel.innerText()
  const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);
  return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorLevelNoUnit[1])}
}

getLocation = async (page) => {
  const address = await page.$('//span[text()[contains(., "所在地")]]/parent::*/following-sibling::dd[1]')
  const addressStr = await address.innerText().then( result => result.trim().split('\n')[0] );
  return addressStr
}

getBuiltYear = async (page) => {
  const builtYrElm = await page.$('//dd[@id="chk-bkc-kenchikudate"]')
  return builtYrElm.innerText().then( (result) => {
    const builtYrStr = result.match(/(\d+)年/)
    return parseInt(builtYrStr[1])
  });
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

      // const response = await new Promise((resolv, reject) => {
      //   clientNotifier.Notify( { rooms: notifyRooms }, function(err, response) {
      //     console.log('Completed Notify', response.status)
      //     resolv(response)
      //   });
      // })
    }
    console.log("subscription closed");
  })();
})();
