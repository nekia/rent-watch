const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');
const { url } = require('inspector');

const SITE_NAME = "SUUMO";
const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const nats_subject_roomurl = process.env.NATS_SUBJECT_ROOMURL ? process.env.NATS_SUBJECT_ROOMURL : "room-suumo-tky-rent";
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
  let price = 0.0, size = 0.0, floorLevel = {}, location = "", builtYear = 0, isPetOK = false;
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
  return { address, price, size, floorLevel, location, builtYear, isPetOK }
}

getPriceFloat = async (page) => {
  const roomPriceElm = await page.$('//div[contains(@class, "property_view_main-emphasis")]')
  const priceStr = await roomPriceElm.innerText();
  const priceWoUnit = priceStr.match(/[\d.]+/);
  return parseFloat(priceWoUnit[0])
}

getSizeFloat = async (page) => {
  const roomSizeElm = await page.$('//div[text()[contains(., "専有面積")]]/following-sibling::div[contains(@class, "property_data-body")]')
  const roomSizeStr = await roomSizeElm.innerText()
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return parseFloat(roomSizeNoUnit[0])
}

getFloorLevel = async (page) => {
  // 階建 | 8階/地下2地上31階建
  const floorLevel = await page.$('//th[text()[contains(., "階建")]]/following-sibling::td[1]')
  const floorLevelStr = await floorLevel.innerText()
  const floorLevelNoUnit = floorLevelStr.match(/[\d.]+/g);
  return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorLevelNoUnit[floorLevelNoUnit.length - 1])}
}

getLocation = async (page) => {
  const address = await page.$('//div[contains(@class, "property_view_detail--location")]/div[contains(@class, "property_view_detail-body")]/div')
  const addressStr = await address.innerText().then( result => result.trim() );
  return addressStr
}

getBuiltYear = async (page) => {
  const builtYrElm = await page.$('//th[text()="築年月"]/following-sibling::td[1]')
  return builtYrElm.innerText().then( (result) => {
    const builtYrStr = result.match(/(\d+)年/)
    return parseInt(builtYrStr[1])
  });
}

getPetOK = async (page) => {
  return page.$('//th[text()="条件"]/following-sibling::td[1]')
    .then( elm => elm.innerText() )
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

      const roomDetail = await scanRoomDetail(url);
      console.log(roomDetail)
      nc.publish("scan-response", jc.encode({ roomDetail }));

    }
    console.log("subscription closed");
  })();
})()