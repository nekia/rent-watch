const playwright = require('playwright');

const notifier = require('./notify')

const MAX_NOTIFIES_AT_ONCE = 200;
const MAX_ROOM_PRICE = 20;
const MIN_ROOM_SIZE = 60;
const MIN_FLOOR_LEVEL = 3;

const Redis = require("ioredis");
// const redis = new Redis(); // uses defaults unless given configuration object
const redis = new Redis(32565); // uses defaults unless given configuration object

const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13101%2C13104%2C13105%2C13110%2C13112%2C13115%2C13114%2C13113%2C13116%2C13120%2C13203%2C13204%2C13211%2C13210%2C13214&monthMoneyRoom=16&monthMoneyRoomHigh=20&houseArea=60&walkMinutes=20&houseAgeHigh=20&newDate=3&mcfs=340102%2C340501&needsCodes=11%2C5&currentHouseArea=60';

scanRoomDetail = async (browser, address) => {
  console.log(address)
  const context = await getNewContext(browser);
  const roomPage = await context.newPage();
  await roomPage.goto(address);
  await roomPage.waitForTimeout(1000)
  const price = await getPriceFloat(roomPage)
  const size = await getSizeFloat(roomPage)
  const floorLevel = await getFloorLevel(roomPage)
  const location = await getLocation(roomPage)
  console.log(price, size, floorLevel, location)
  await roomPage.close();
  await context.close();
  return { address, price, size, floorLevel, location }
}

createKeyFromDetail = (detailObj) => {
  const key = [
    detailObj.price,
    detailObj.size,
    detailObj.floorLevel.floorLevel,
    detailObj.floorLevel.floorTopLevel,
    detailObj.location
  ].join('-');
  console.log(key)
  return key
}

scanRoom = async (browser, page) => {
  const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
  for (let btn of moreRoomsBtns) {
    await btn.click()
  }
  const notifys = [];
  const roomLinks = await page.$$('//li[@class="building-room"]/a');
  for (let i = 0; i < roomLinks.length; i++ ) {
    const link = roomLinks[i]
    const address = await link.getAttribute("href");
    const detailObj = await scanRoomDetail(browser, address)
    const key = createKeyFromDetail(detailObj)
    if (!await redis.exists(key)) {
      if (detailObj.price <= MAX_ROOM_PRICE &&
          detailObj.size >= MIN_ROOM_SIZE &&
          detailObj.floorLevel.floorLevel != detailObj.floorLevel.floorTopLevel &&
          detailObj.floorLevel.floorLevel >= MIN_FLOOR_LEVEL ) {
        notifys.push(detailObj)
        console.log(address, key)
      } else {
        console.log('Too expensive and/or small', key)
      }
    } else {
      console.log('Already notified', key)
    }
  }
  return notifys;
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

getNewContext = async (browser) => {
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4595.0 Safari/537.36'
  });
}

(async () => {
  // const browser = await playwright['chromium'].launch({ headless: false });
  const browser = await playwright['chromium'].launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
  const context = await getNewContext(browser);
  await context.setDefaultNavigationTimeout(60000);

  const page = await context.newPage();
  // console.log(await page.evaluate(() => navigator.userAgent));
  await page.goto(checkUrl);

  await page.waitForTimeout(5000)

  let notifyRooms = [];
  while (1) {
    const rooms = await scanRoom(browser, page)

    // Pagenation
    notifyRooms.push(...rooms)
    const nextPageBtns = await page.$$('//div[@class="pagination-mediumController"]');
    const existNextPage = await nextPageBtns[1].$('//a')
    if (!existNextPage) {
      // console.log('End of pages')
      break
    } else {
      // console.log('Next page')
      await existNextPage.click()
      await page.waitForTimeout(5000)
    }
  }

  // console.log(notifyRooms)
  for ( let i = 0; i < notifyRooms.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
    const key = createKeyFromDetail(notifyRooms[i])
    if (!await redis.exists(key)) {
      await notifier.notifyLine(notifyRooms[i])
      // await redis.set(key, 1, "EX", 432000) // expire in 5 days
      console.log('Notified (Paased redundant check)', key)
      await redis.set(key, 1) // expire in 5 days
    } else {
      console.log('Already notified (redundant check)', key)
    }
  }

  await page.close()
  await browser.close();
  await redis.disconnect()
  console.log('Done - Homes');
})();

