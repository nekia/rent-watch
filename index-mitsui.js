const playwright = require('playwright');
// const Redis = require("ioredis");

const utils = require('./utils')
const Homes = require('./index-homes')
const Suumo = require('./index-suumo')
const RStore = require('./index-rstore')

// const redis = new Redis(); // uses defaults unless given configuration object
// const redis = new Redis(32565); // uses defaults unless given configuration object

const MAX_NOTIFIES_AT_ONCE = 200;

scanRoom = async (page) => {
  const eachDoorBtn = await page.$('//span[contains(@class, "fr_list-eachicon--door")]');
  await eachDoorBtn.click()
  await page.waitForTimeout(5000)
  const roomLinks = await page.$$('//h2[contains(@class, "property_inner-title")]/a')
  const notifys = [];
  for (let i = 0; i < roomLinks.length; i++ ) {
    const link = roomLinks[i];
    const pathAddress = await link.getAttribute("href");
    const address = `https://suumo.jp${pathAddress}`;
    if (await this.redis.exists(address)) {
      console.log('Already notified', address)
      continue
    }
    const detailObj = await this.scanRoomDetail(address)
    if (detailObj.location.length == 0) {
      continue;
    }
    const key = utils.createKeyFromDetail(detailObj)
    if (!await this.redis.exists(key)) {
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
      await this.redis.set(detailObj.address, 1)
    }
  }
  return notifys;
};

(async () => {
  const browser = await playwright['chromium'].launch({ headless: false });
  // const browser = await playwright['chromium'].launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
  const context = await utils.getNewContext(browser);
  let page = await context.newPage();

  await page.waitForTimeout(5000)

  let notifyRooms = [];
  console.log(`##### Start - Mitsui`);
  await page.goto("https://www.mitsui-chintai.co.jp/rf/result?ku=(1,22),(1,12),(1,19),(1,18)&reb=250&req=(1,0,0)&ms=(60,0)&cms=1dvxwqtyww&get=ward");

  await page.$('//a[contains(@class, "closePopup")]').then((btn) => btn.click())
  await page.waitForTimeout(5000)
  // while (1) {
  //   const rooms = await scanRoom(page)

  //   // Pagenation
  //   notifyRooms.push(...rooms)
  //   const { nextPageExist,  nextPage } = await site.pagenation(page)
  //   if (!nextPageExist) {
  //     break;
  //   } else {
  //     page = nextPage;
  //   }
  // }

  // for ( let i = 0; i < notifyRooms.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
  //   const key = utils.createKeyFromDetail(notifyRooms[i])
  //   if (!await redis.exists(key)) {
  //     await utils.notifyLine(notifyRooms[i])
  //     console.log('Notified (Paased redundant check)', key)
  //     await redis.set(key, 1)
  //     await redis.set(notifyRooms[i].address, 1)
  //   } else {
  //     console.log('Already notified (redundant check)', key)
  //   }
  // }
  console.log(`##### Done - ${site.getSitename()}`);

  await page.close()
  await browser.close();
  redis.disconnect()
})();

