const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const nats_subject_roomurl = process.env.NATS_SUBJECT_ROOMURL ? process.env.NATS_SUBJECT_ROOMURL : "room-bs-tky-rent";
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
  let price = 0.0, size = 0.0, floorLevel = { floorLevel: 99, floorTopLevel: 100 }, location = "", builtYear = 2021;
  const results = [];
  try {
    await roomPage.goto(address);
    await roomPage.waitForSelector('//h4[text()="Outline"]')

    let rooms = await roomPage.$$('//div[contains(@class, "summary")]/p[contains(@class, "map")]')
    for (let i = 0; i < rooms.length; i++) {
      let full = await rooms[i].$('//preceding-sibling::p[text()[contains(., "Full")]]')
      let detail = await rooms[i].$('//preceding-sibling::table')
      if (detail == undefined) {
        continue
      }
      console.log(`---------`)
      size = await getSizeFloat(detail)
      location = await getLocation(roomPage)

      if (full != undefined) {
        console.log('Full', size, '-', location)
        continue
      }

      price = await getPriceFloat(detail)
      location = location + `-${i}`
      results.push({ address, price, size, floorLevel, location, builtYear })
    }
  } catch (error) {
    console.warn('## Failed to retrieve the detail ##', address, error)
  }
  await roomPage.close()
  await browser.close();
  return results
}

getPriceFloat = async (detail) => {
  let priceStr = await detail.$('//th[text()[contains(., "賃料")]]/following-sibling::td').then( td => td.innerText() )
  const priceNoUnitStr = priceStr.match(/[\d,]+/);
  return parseInt(priceNoUnitStr[0].replace(/,/g, '')) / 10000
}

getSizeFloat = async (detail) => {
  const roomSizeStr = await detail.$('//th[text()="面積／間取り"]/following-sibling::td').then( td => td.innerText() )
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return parseFloat(roomSizeNoUnit[0])
}

getLocation = async (page) => {
  return await page.$('//*[@id="normal"]/div[2]/div[2]/table[1]/tbody/tr[1]/td[2]').then( td => td.innerText()).then( result => result.trim() );
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
