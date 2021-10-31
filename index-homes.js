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

const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13201%2C13202%2C13203%2C13204%2C13205%2C13206%2C13207%2C13208%2C13209%2C13210%2C13211%2C13212%2C13213%2C13214%2C13215%2C13218%2C13219%2C13220%2C13221%2C13222%2C13223%2C13224%2C13225%2C13227%2C13228%2C13229%2C13303%2C13305%2C13307%2C13308%2C13360%2C13361%2C13362%2C13363%2C13364%2C13380%2C13381%2C13382%2C13400%2C13401%2C13402%2C13420%2C13421%2C13101%2C13102%2C13103%2C13104%2C13105%2C13106%2C13108%2C13109%2C13110%2C13111%2C13112%2C13113%2C13114%2C13115%2C13116%2C13117%2C13119%2C13120&monthMoneyRoom=17&monthMoneyRoomHigh=30&moneyMaintenanceInclude=1&houseArea=50&houseAgeHigh=20&mbgs=3002&newDate=1&mcfs=113201%2C340102%2C240104%2C220301%2C290901%2C223101%2C290401%2C340501&needsCodes=14';

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
  const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
  for (let btn of moreRoomsBtns) {
    await btn.click()
  }
  const notifys = [];
  const roomLinks = await page.$$('//li[@class="building-room"]/a');
  for (let i = 0; i < roomLinks.length; i++ ) {
    const link = roomLinks[i]
    const address = await link.getAttribute("href");
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
  const roomPrices = await page.$$('//span[contains(@class, "room-moneyRoomNumber")]')
  const roomPriceStr = await roomPrices[idx].innerText()
  return roomPriceStr
}

getSizeStr = async (page, idx) => {
  const roomSizes = await page.$$('//span[@data-target="roomArea"]')
  const roomSizeStr = await roomSizes[idx].innerText()
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
    const rooms = await scanRoom(page)

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
    await notifyLine(notifyRooms[i])
  }
  await page.close()
  await browser.close();
  await redis.disconnect()
  console.log('Done - Homes');
})();

