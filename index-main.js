const playwright = require('playwright');

const utils = require('./utils');
const TPO = require('./index-tpo');
const BS = require('./index-bs');
const TD = require('./index-td');
const KEN = require('./index-ken');
const setting = require('./setting');

(async () => {
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await utils.getNewContext(browser);
  const tpoSite = new TPO(browser, context)
  const bsSite = new BS(browser, context)
  const tdSite = new TD(browser, context)
  const kenSite = new KEN(browser, context)
  const searchingSites =  [tpoSite, bsSite, tdSite, kenSite];

  let page = await utils.getNewPage(context);

  await page.waitForTimeout(5000)

  for ( site of searchingSites ) {
    let notifyRooms = [];
    console.log(`##### Start - ${site.getSitename()}`);
    let URLs = site.getCheckUrl()
    for ( url of URLs ) {
      await page.goto(url);
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

