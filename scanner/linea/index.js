const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const SITE_NAME = "LINEA";
const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";

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

ScanRoomDetail = async (address) => {
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await getNewContext(browser);
  const roomPage = await getNewPage(context);
  let price = 0.0, size = 0.0, floorLevel = {}, location = "", builtYear = 0, isPetOK = false;
  console.log(address)
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    price = await getPriceFloat(roomPage)
    size = await getSizeFloat(roomPage)
    floorLevel = await getFloorLevel(roomPage)
    location = await getLocation(roomPage)
    builtYear = await getBuiltYear(roomPage)
    isPetOK = await getPetOK(roomPage)
  } catch (error) {
    console.warn('## Failed to retrieve the detail ##', address, error)
  }

  await roomPage.close()
  await browser.close();
  return { address, price, size, floorLevel, location, builtYear, isPetOK };
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

getPetOK = async (page) => {
  return page.$('//div[text()="賃貸条件・その他"]/following-sibling::dl[@class="spec-block"]/dt[text()="その他"]/following-sibling::dd[1]')
  .then( dd => dd.innerText() )
  .then( str => str.includes("ペット") )
}

(async () => {

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();
  // create a simple subscriber and iterate over messages
  // matching the subscription

  const subScanReq = nc.subscribe("scan-request", { queue: `room-${SITE_NAME}` });
  (async () => {
    for await (const m of subScanReq) {
      const urlObj = jc.decode(m.data);
      console.log(urlObj)
      const url = urlObj.url;
      const siteName = urlObj.siteName;

      if( siteName !== SITE_NAME) {
        console.log(`It's not a request for me: [${siteName}]`)
        continue;
      }

      console.log(`[${subScanReq.getProcessed()}]: ${siteName}`);

      const roomDetail = await ScanRoomDetail(url);
      console.log(roomDetail)
      nc.publish("scan-response", jc.encode({ roomDetail }));

    }
    console.log("subscription closed");
  })();
})()