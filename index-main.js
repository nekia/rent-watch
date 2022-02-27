const playwright = require('playwright');

const utils = require('./utils');
const Homes = require('./index-homes');
const Suumo = require('./index-suumo');
const RStore = require('./index-rstore');
const setting = require('./setting');

(async () => {
  // const browser = await playwright['chromium'].launch({ headless: false });
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await utils.getNewContext(browser);
  const homesSite = new Homes(browser, context)
  const suumoSite = new Suumo(browser, context)
  const rstoreSite = new RStore(browser, context)
  const searchingSites =  [homesSite, suumoSite, rstoreSite];

  let page = await utils.getNewPage(context);

  await page.waitForTimeout(5000)

  for ( site of searchingSites ) {
    let notifyRooms = [];
    console.log(`##### Start - ${site.getSitename()}`);
    await page.goto(site.getCheckUrl());
    while (1) {
      const rooms = await site.scanRoom(page)
  
      // Pagenation
      notifyRooms.push(...rooms)

      if (utils.getNewPageCount() > setting.MAX_NEW_PAGE_COUNT) {
        console.log('Reached max new page count', utils.getNewPageCount())
        break
      }
      
      const { nextPageExist,  nextPage } = await site.pagenation(page)
      if (!nextPageExist) {
        break;
      } else {
        page = nextPage;
      }
    }
  
    for ( let i = 0; i < notifyRooms.length && i < setting.MAX_NOTIFIES_AT_ONCE; i++ ) {
      const key = utils.createKeyFromDetail(notifyRooms[i])
      if (!await utils.checkCacheByKey(key)) {
        await utils.notifyLine(notifyRooms[i])
        console.log('Notified (Paased redundant check)', key)
      }
      await utils.addCache(notifyRooms[i], utils.CACHE_KEY_VAL_NOTIFIED)
    }
    console.log(`##### Done - ${site.getSitename()}`);
  }

  await page.close()
  await browser.close();
  utils.disconnectCache()

})();

