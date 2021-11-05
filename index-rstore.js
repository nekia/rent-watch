const playwright = require('playwright');

const notifier = require('./notify')

const MAX_NOTIFIES_AT_ONCE = 10;
const MAX_ROOM_PRICE = 210000;
const MIN_ROOM_SIZE = 60;

const Redis = require("ioredis");
const redis = new Redis(); // uses defaults unless given configuration object

const checkUrl = 'https://www.r-store.jp/search/?&sb_get_full1=true&sb_purpose1%5B%5D=R&sb_r_min=170000&sb_r_max=210000&sb_walk_from=15&sb_area_up=60&sb_age_of_building=20&sb_kodawari_category%5B%5D=2%E9%9A%8E%E4%BB%A5%E4%B8%8A&sb_c%5B%5D=13105&sb_c%5B%5D=13110&sb_c%5B%5D=13112&sb_c%5B%5D=13114&sb_c%5B%5D=13115&sb_c%5B%5D=13120&sb_c%5B%5D=13116&sb_c%5B%5D=13203&sb_c%5B%5D=13204&sb_c%5B%5D=13210&sb_c%5B%5D=13214&sb_purpose2%5B%5D=RO&sb_purpose2%5B%5D=RS&sort_key=1&view_num=10&get_full=true';
// const checkUrl = 'https://www.r-store.jp/search/?&sb_get_full1=true&sb_purpose1%5B%5D=R&sb_r_min=170000&sb_r_max=230000&sb_area_up=55&sb_pet%5B%5D=%E5%B0%8F%E5%9E%8B%E7%8A%AC%E5%8F%AF&sb_pet%5B%5D=%E7%8C%AB%E5%8F%AF&sb_purpose2%5B%5D=RO&sb_purpose2%5B%5D=RS';
// const checkUrl = 'https://www.r-store.jp/search/?&sb_get_full1=true&sb_purpose1%5B%5D=R&sb_r_min=170000&sb_r_max=230000&sb_area_up=55&sb_purpose2%5B%5D=RO&sb_purpose2%5B%5D=RS&sort_key=1&view_num=10&get_full=true';

scanRoom = async (page) => {
  const notifys = [];
  const roomLinks = await page.$$('//div[contains(@class, "post-list")]');
  console.log(roomLinks.length)
  for (let i = 0; i < roomLinks.length; i++ ) {
    const link = roomLinks[i]
    const anchor = await link.$('a')
    const addressPath = await anchor.getAttribute("href");
    const address = `https://r-store.jp${addressPath}`
    // console.log(address)
    if (!await redis.exists(address)) {
      const price = await getPriceStr(page, i)
      const size = await getSizeStr(page, i)
      if (parseFloat(price) <= MAX_ROOM_PRICE && parseFloat(size) >= MIN_ROOM_SIZE ) {
        notifys.push({ url: address, price: parseFloat(price), size: parseFloat(size) })
        console.log(address, price, size)
      } else {
        console.log('Too expensive and/or small', address, price, size)
      }
    } else {
      console.log('Already notified', address)
    }
  }
  return notifys;
}

getPriceStr = async (page, idx) => {
  const roomPrices = await page.$$('//h3[contains(@class, "post-price")]')
  const roomPriceStr = await roomPrices[idx].innerText()
  const prices = roomPriceStr.split('/')
  const priceNoUnit = prices[0].match(/[\d,]+/);
  return priceNoUnit[0].replace(/,/g, '')
}

getSizeStr = async (page, idx) => {
  const roomSizes = await page.$$('//span[contains(@class, "spec-area")]')
  const roomSizeStr = await roomSizes[idx].innerText()
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return roomSizeNoUnit[0]
}


(async () => {
  // const browser = await playwright['chromium'].launch({ headless: true });
  const browser = await playwright['chromium'].launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4595.0 Safari/537.36'
  });
  const page = await context.newPage();
  // console.log(await page.evaluate(() => navigator.userAgent));
  await page.goto(checkUrl);
  let notifyRooms = [];
  while (1) {
    const rooms = await scanRoom(page)

    // Pagenation
    notifyRooms.push(...rooms)
    const nextPageAnchor = await page.$('//li[@class="page-nav-next"]/a');
    if (!nextPageAnchor) {
      console.log('End of pages')
      break
    } else {
      console.log('Next page')
      await nextPageAnchor.click()
      await page.waitForTimeout(5000)
    }
  }

  for ( let i = 0; i < notifyRooms.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
    await notifier.notifyLine(notifyRooms[i])
    await redis.set(notifyRooms[i].url, 1, "EX", 432000) // expire in 5 days
  }
  
  await page.close()
  await browser.close();
  await redis.disconnect()
  console.log('Done - R-Store');
})();

