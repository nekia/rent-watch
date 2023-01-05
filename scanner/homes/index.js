const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const SITE_NAME = "HOMES";
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

getPetOK = async (page) => {
  return page.$('//li[@class="active"]/span[text()="ペット相談可"]')
    .then( elm => elm != undefined )
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