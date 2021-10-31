const playwright = require('playwright');
const axios = require('axios');
const querystring = require('querystring');

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const MAX_NOTIFIES_AT_ONCE = 10;
const MAX_ROOM_PRICE = 23;
const MIN_ROOM_SIZE = 57;

const Redis = require("ioredis");
const redis = new Redis(); // uses defaults unless given configuration object

const checkUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&fw2=&pc=30&po1=25&po2=99&ta=13&sc=13101&sc=13102&sc=13103&sc=13104&sc=13105&sc=13113&sc=13109&sc=13110&sc=13112&sc=13114&sc=13115&sc=13120&sc=13203&sc=13204&sc=13210&ts=1&cb=15.0&ct=26.0&et=9999999&mb=55&mt=9999999&cn=20&co=1&tc=0401303&tc=0400101&tc=0400104&tc=0400301&tc=0401102&shkr1=03&shkr2=03&shkr3=03&shkr4=03';

const config = {
  baseURL: BASE_URL,
  url: PATH,
  method: 'post',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Bearer ${LINE_TOKEN}`
  },
  data: querystring.stringify({
    message: `line通知`,
  })
};

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
    if (!await redis.exists(address)) {
      const price = await getPriceStr(page, i)
      const size = await getSizeStr(page, i)
      if (parseFloat(price) < MAX_ROOM_PRICE && parseFloat(size) > MIN_ROOM_SIZE ) {
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
  const roomPrices = await page.$$('//div[contains(@class, "detailbox-property-point")]')
  const priceStr = await roomPrices[idx].innerText();
  const priceWoUnit = priceStr.match(/[\d.]+/);
  return priceWoUnit[0]
}

getSizeStr = async (page, idx) => {
  const roomDetails = await page.$$('//div[@class="property-body-element"]/div[@class="detailbox"]/div[@class="detailbox-property"]')
  const roomDetailCol = await roomDetails[idx].$('//td[contains(@class, "detailbox-property--col3")]')
  const roomSize = await roomDetailCol.$$('//div')
  const roomSizeStr = await roomSize[1].innerText()
  const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
  return roomSizeNoUnit[0]
}

notifyLine = async (roomObj) => {
  console.log(`New room !!`, roomObj.url)
  config.data = querystring.stringify({
    message: `新しい物件が掲載されました! \n${roomObj.url}\n${roomObj.price}万円\n${roomObj.size}平米`,
  })
  const response = await axios.request(config);
  await redis.set(roomObj.url, 1, "EX", 432000) // expire in 5 days
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
    const roomes = await scanRoom(page)

    // Pagenation
    notifyRooms.push(...roomes)
    const nextPageBtn = await page.$('//p[@class="pagination-parts"]/a[contains(text(), "次へ")]');
    if (!nextPageBtn) {
      // console.log('End of pages')
      break
    } else {
      // console.log('Next page')
      await nextPageBtn.click()
      await page.waitForTimeout(5000)
    }
  }
  // console.log(notifyRooms)
  for ( let i = 0; i < notifyRooms.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
    await notifyLine(notifyRooms[i])
  }
  await page.close()
  await browser.close();
  await redis.disconnect()
  console.log('Done - Suumo');
})();

