const playwright = require('playwright');
const axios = require('axios');
const querystring = require('querystring');

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const MAX_NOTIFIES_AT_ONCE = 1;

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

scanPage = async (page) => {
  const eachDoorBtn = await page.$('//span[contains(@class, "fr_list-eachicon--door")]');
  await eachDoorBtn.click()
  await page.waitForTimeout(5000)
  const roomLinks = await page.$$('//h2[contains(@class, "property_inner-title")]/a')
  const notifys = [];
  for (let link of roomLinks) {
    const pathAddress = await link.getAttribute("href");
    const address = `https://suumo.jp${pathAddress}`;
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
    message: `新しい物件が掲載されました! \n${url}`,
  })
  const response = await axios.request(config);
  await redis.set(url, 1, "EX", 432000) // expire in 5 days
}

(async () => {
  const browser = await playwright['chromium'].launch({ headless: false });
  // const browser = await playwright['chromium'].launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4595.0 Safari/537.36'
  });
  const page = await context.newPage();
  // console.log(await page.evaluate(() => navigator.userAgent));
  await page.goto(checkUrl);
  let notifyAddresses = [];
  while (1) {
    const addresses = await scanPage(page)

    // Pagenation
    notifyAddresses.push(...addresses)
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
  // console.log(notifyAddresses)
  for ( let i = 0; i < notifyAddresses.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
    await notifyLine(notifyAddresses[i])
  }
  await page.close()
  await browser.close();
  await redis.disconnect()
  console.log('Done - Suumo');
})();

