const playwright = require('playwright');
const axios = require('axios');
const querystring = require('querystring');

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const MAX_NOTIFIES_AT_ONCE = 3;

const Redis = require("ioredis");
const redis = new Redis(); // uses defaults unless given configuration object

const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13201%2C13202%2C13203%2C13204%2C13205%2C13206%2C13207%2C13208%2C13209%2C13210%2C13211%2C13212%2C13213%2C13214%2C13215%2C13218%2C13219%2C13220%2C13221%2C13222%2C13223%2C13224%2C13225%2C13227%2C13228%2C13229%2C13303%2C13305%2C13307%2C13308%2C13360%2C13361%2C13362%2C13363%2C13364%2C13380%2C13381%2C13382%2C13400%2C13401%2C13402%2C13420%2C13421%2C13101%2C13102%2C13103%2C13104%2C13105%2C13106%2C13108%2C13109%2C13110%2C13111%2C13112%2C13113%2C13114%2C13115%2C13116%2C13117%2C13119%2C13120&monthMoneyRoom=17&monthMoneyRoomHigh=30&moneyMaintenanceInclude=1&houseArea=50&houseAgeHigh=20&mbgs=3002&newDate=1&mcfs=113201%2C340102%2C240104%2C220301%2C290901%2C223101%2C290401%2C340501&needsCodes=14';
// const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13201%2C13202%2C13203%2C13204%2C13205%2C13206%2C13207%2C13208%2C13209%2C13210%2C13211%2C13212%2C13213%2C13214%2C13215%2C13218%2C13219%2C13220%2C13221%2C13222%2C13223%2C13224%2C13225%2C13227%2C13228%2C13229%2C13303%2C13305%2C13307%2C13308%2C13360%2C13361%2C13362%2C13363%2C13364%2C13380%2C13381%2C13382%2C13400%2C13401%2C13402%2C13420%2C13421%2C13101%2C13102%2C13103%2C13104%2C13105%2C13106%2C13108%2C13109%2C13110%2C13111%2C13112%2C13113%2C13114%2C13115%2C13116%2C13117%2C13119%2C13120&monthMoneyRoom=17&monthMoneyRoomHigh=30&moneyMaintenanceInclude=1&houseArea=50&houseAgeHigh=20&mbgs=3002&newDate=1&mcfs=113201%2C340102%2C240104%2C220301%2C290901%2C223101&wantMcfs=340501%2C290401%2C330101&needsCodes=14';
const roomUrl = 'https://www.linea.co.jp/article/room/type/rent/id/304/rid'
const watchLists = {
  rooms: [
    {
      number: '201',
      id: '2060'
    },
    {
      number: '301',
      id: '2065'
    },
    {
      number: '401',
      id: '2070'
    },
    {
      number: '501',
      id: '2075'
    },
    {
      number: '601',
      id: '2080'
    },
    {
      number: '603',
      id: '2082'
    },
    {
      number: '701',
      id: '2083'
    },
    {
      number: '801',
      id: '2086'
    },
    {
      number: '802',
      id: '2086'
    }
  ]
};

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

scanPage = async (page) => {
  const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
  for (let btn of moreRoomsBtns) {
    await btn.click()
  }
  const notifys = [];
  const roomLinks = await page.$$('//li[@class="building-room"]/a');
  for (let link of roomLinks) {
    const address = await link.getAttribute("href");
    if (!await redis.exists(address)) {
      notifys.push(address)
      console.log(address)
    } else {
      console.log('Already notified', address)
    }
  }
  return notifys;
}

notifyLine = async (url) => {
  console.log(`New room !!`, url)
  config.data = querystring.stringify({
    message: `新しい物件が掲載されました! ${url}}`,
  })
  // const response = await axios.request(config);
  await redis.set(url, 1)
}

(async () => {
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4595.0 Safari/537.36'
  });
  const page = await context.newPage();
  console.log(await page.evaluate(() => navigator.userAgent));
  console.log("test")
  await page.goto(checkUrl);
  let notifyAddresses = [];
  while (1) {
    const addresses = await scanPage(page)
    notifyAddresses.push(...addresses)
    const nextPageBtns = await page.$$('//div[@class="pagination-mediumController"]');
    await page.screenshot({ path: `room-test.png` });
    await page.setU
    const existNextPage = await nextPageBtns[1].$('//a')
    if (!existNextPage) {
      console.log('End of pages')
      break
    } else {
      console.log('Next page')
      await existNextPage.click()
      await page.waitForTimeout(5000)
    }
  }
  console.log(notifyAddresses)
  for ( let i = 0; i < notifyAddresses.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
    notifyLine(notifyAddresses[i])
  }
  await page.close()
  await browser.close();
})();

