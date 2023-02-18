const nats = require('nats');
const playwright = require('playwright-chromium');
const express = require('express');
const http = require('http');

const SITE_NAME = "R-STORE";
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
  const roomPriceElm = await page.$('//h3[text()[contains(., "賃料")]]/following-sibling::p[1]')
  const priceStr = await roomPriceElm.innerText();
  const priceNoUnit = priceStr.match(/[\d,]+/);
  return parseInt(priceNoUnit[0].replace(/,/g, '')) / 10000
}

getSizeFloat = async (page) => {
  const roomSizeElm = await page.$('//h3[text()[contains(., "面積")]]/following-sibling::p[1]')
  const roomSizeStr = await roomSizeElm.innerText()
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return parseFloat(roomSizeNoUnit[0])
}

getFloorLevel = async (page) => {
  // e.g. 鉄筋コンクリート造 地上3階建て
  // e.e. 鉄筋コンクリート造 地下1階 地上10階建て
  const floorTopLevel = await page.$('//h3[text()[contains(., "構造")]]/following-sibling::p[1]')
  const floorTopLevelStr = await floorTopLevel.innerText()
  const floorTopLevelNoUnit = floorTopLevelStr.match(/[\d]+/g);

  const floorLevel = await page.$('//h3[text()[contains(., "所在階")]]/following-sibling::p[1]')
  const floorLevelStr = await floorLevel.innerText()
  const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);

  return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorTopLevelNoUnit.slice(-1))}
}

getLocation = async (page) => {
  const address = await page.$('//h3[text()[contains(., "所在地")]]/following-sibling::p[1]/a')
  const addressStr = await address.innerText().then( result => result.trim() );
  return addressStr
}

getBuiltYear = async (page) => {
  return page.$('//h3[text()="築年"]/following-sibling::p[1]')
  .then( p => p.innerText() )
  .then( str => {
    const builtYrStr = str.match(/(\d+)年/)
    return parseInt(builtYrStr[1])
  })
}

getPetOK = async (page) => {
  return page.$('//h3[text()="ペット飼育"]/following-sibling::p[1]')
  .then( p => p.innerText() )
  .then( str => str != "不可" )
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