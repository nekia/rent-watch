const playwright = require('playwright');
const Redis = require("ioredis");

const utils = require('./utils')
const Homes = require('./index-homes')
const Suumo = require('./index-suumo')
const RStore = require('./index-rstore')

const redis = new Redis(); // uses defaults unless given configuration object
// const redis = new Redis(32565); // uses defaults unless given configuration object

const MAX_NOTIFIES_AT_ONCE = 200;

(async () => {
  const browser = await playwright['chromium'].launch({ headless: false });
  // const browser = await playwright['chromium'].launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
  const context = await utils.getNewContext(browser);
  const homesSite = new Homes(browser, context, redis)
  const suumoSite = new Suumo(browser, context, redis)
  const rstoreSite = new RStore(browser, context, redis)
  const searchingSites =  [rstoreSite]
  let page = await context.newPage();

  await page.waitForTimeout(5000)

  for ( site of searchingSites ) {
    let notifyRooms = [];
    console.log(`##### Start - ${site.getSitename()}`);
    await page.goto(site.getCheckUrl());
    while (1) {
      const rooms = await site.scanRoom(page)
  
      // Pagenation
      notifyRooms.push(...rooms)
      const { nextPageExist,  nextPage } = await site.pagenation(page)
      if (!nextPageExist) {
        break;
      } else {
        page = nextPage;
      }
    }
  
    for ( let i = 0; i < notifyRooms.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
      const key = utils.createKeyFromDetail(notifyRooms[i])
      if (!await redis.exists(key)) {
        await utils.notifyLine(notifyRooms[i])
        console.log('Notified (Paased redundant check)', key)
        await redis.set(key, 1)
      } else {
        console.log('Already notified (redundant check)', key)
      }
    }
    console.log(`##### Done - ${site.getSitename()}`);
  }

  await page.close()
  await browser.close();
  redis.disconnect()
})();

