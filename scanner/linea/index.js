const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const utils = require('./utils')

const nats_server_name = process.env.NATS_SERVER_NAME ? process.env.NATS_SERVER_NAME : "127.0.0.1";

ScanRoomDetail = async (address) => {
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await utils.getNewContext(browser);
  const roomPage = await utils.getNewPage(context);
  let price = 0.0, size = 0.0, floorLevel = {}, location = "", builtYear = 0;
  console.log(address)
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
  } finally {
    await roomPage.close();
  }
  await roomPage.close()
  await browser.close();
  return { address, price, size, floorLevel, location, builtYear };
};

getPriceFloat = async (page) => {
  const priceStr = await page.$('//ul[contains(@class, "room-main-floor-list")]/li[text()[contains(., "賃料")]]')
    .then(elm => elm.innerText())
    .then(str => str.match(/([\d,]+)円/))
  return parseInt(priceStr[1].replace(/,/g, '')) / 10000
}

getSizeFloat = async (page) => {
  const roomSizeStr = await page.$('//ul[contains(@class, "room-main-floor-list")]/li[text()[contains(., "面積")]]')
    .then(elm => elm.innerText())
    .then(str => str.match(/([\d.]+)㎡/))
  return parseFloat(roomSizeStr[1])
}

getFloorLevel = async (page) => {
  const floorLevel = await page.$('//div[contains(@class, "room-main-floor-name")]/a')
    .then(elm => elm.innerText())
    .then(str => str.match(/(\d+)\d\d/))

  const floorLevellInt = floorLevel != null ? parseInt(floorLevel[1]) : 2;

  let floorTopLevelInt = 0;
  try {
    const floorTopLevel = await page.$('//ul[contains(@class, "apartment-header-listSpec")]/li[text()[contains(., "階")]]')
      .then(elm => elm.innerText())
      .then(str => str.match(/(\d+)階建*/))
    floorTopLevelInt = parseInt(floorTopLevel[1])
  } catch (error) {
    floorTopLevelInt = floorLevellInt + 1;
  }

  return { floorLevel: floorLevellInt, floorTopLevel: floorTopLevelInt }
}

getLocation = async (page) => {
  const addressStr = await page.$('//div[contains(@class, "spec-group-item")]//dt[text()[contains(., "所在地")]]/following-sibling::dd[1]')
    .then(elm => elm.innerText())
    .then(str => str.trim())
  return addressStr
}

getBuiltYear = async (page) => {
  return page.$('//div[contains(@class, "spec-group-item")]//dt[text()="竣工年"]/following-sibling::dd[1]')
    .then(elm => elm.innerText())
    .then(str => {
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

  const nc = await nats.connect({ servers: `${nats_server_name}:4222` });
  const js = nc.jetstream();

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();
  // create a simple subscriber and iterate over messages
  // matching the subscription
  const sub = nc.subscribe("room-linea", { queue: "room" });
  (async () => {
    for await (const m of sub) {
      const address = sc.decode(m.data);
      console.log(`[${sub.getProcessed()}]: ${address}`);
      // if (await utils.checkCacheByUrl(address)) {
      //   continue
      // }

      const detailObj = await ScanRoomDetail(address);
      console.log(detailObj)
      js.publish("roomdetails", jc.encode(detailObj))
      // if (detailObj.location.length == 0) {
      //   continue;
      // }
      // if (await utils.meetCondition(detailObj)) {
      //   notifys.push(detailObj)
      // } else {
      //   await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
      // }

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
