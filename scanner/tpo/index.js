const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const nats_subject_roomurl = process.env.NATS_SUBJECT_ROOMURL ? process.env.NATS_SUBJECT_ROOMURL : "room-tpo-tky-rent";
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

    let rented = await roomPage.$('//div[text()[contains(., "申込み有")]]')
    if (rented != undefined) {
      console.log('Sold out')
      await roomPage.close()
      await browser.close();
      return {}
    }

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
  const priceStr = await page.$('//li[text()[contains(., "賃料：")]]').then((li) => li.innerText() )
  const priceNoUnit = priceStr.match(/[\d,]+/);
  return parseInt(priceNoUnit[0].replace(/,/g, '')) / 10000
}

getSizeFloat = async (page) => {
  const roomSizeStr = await page.$('//li[text()[contains(., "面積：")]]').then((li) => li.innerText())
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return parseFloat(roomSizeNoUnit[0])
}

getFloorLevel = async (page) => {
  // e.g. 鉄筋コンクリート造 地上3階建て
  // e.e. 鉄筋コンクリート造 地下1階 地上10階建て
  const floorTopLevelStr = await page.$('//li/b[text()[contains(., "規模：")]]/parent::*').then((li) => li.innerText())
  const floorTopLevelNoUnit = floorTopLevelStr.match(/[\d]+/g);

  // const floorLevel = await page.$('//h3[text()[contains(., "所在階")]]/following-sibling::p[1]')
  // const floorLevelStr = await floorLevel.innerText()
  // const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);
  const floorTopLevel = parseInt(floorTopLevelNoUnit.slice(-1));
  const floorLevel = floorTopLevel - 1;
  return { floorLevel, floorTopLevel }
}

getLocation = async (page) => {
  return await page.$('//div[contains(@class, "roomAddress")]/p[1]').then((p) => p.innerText()).then( result => result.trim() );
}


getBuiltYear = async (page) => {
  return await page.$('//li/b[text()[contains(., "竣工：")]]/parent::*')
    .then((li) => li.innerText())
    .then( str => {
      const builtYrStr = str.match(/(\d+)年/)
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
      if (Object.keys(detailObj).length != 0) {
        console.log(detailObj)
        js.publish(nats_subject_roomdetail, jc.encode(detailObj))
      }
    }
    console.log("subscription closed");
  })();
})();
