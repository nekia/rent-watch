const playwright = require('playwright');
const axios = require('axios');
const qs = require('querystring');

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

// const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13201%2C13202%2C13203%2C13204%2C13205%2C13206%2C13207%2C13208%2C13209%2C13210%2C13211%2C13212%2C13213%2C13214%2C13215%2C13218%2C13219%2C13220%2C13221%2C13222%2C13223%2C13224%2C13225%2C13227%2C13228%2C13229%2C13303%2C13305%2C13307%2C13308%2C13360%2C13361%2C13362%2C13363%2C13364%2C13380%2C13381%2C13382%2C13400%2C13401%2C13402%2C13420%2C13421%2C13101%2C13102%2C13103%2C13104%2C13105%2C13106%2C13108%2C13109%2C13110%2C13111%2C13112%2C13113%2C13114%2C13115%2C13116%2C13117%2C13119%2C13120&monthMoneyRoom=17&monthMoneyRoomHigh=30&moneyMaintenanceInclude=1&houseArea=50&houseAgeHigh=20&mbgs=3002&newDate=1&mcfs=113201%2C340102%2C240104%2C220301%2C290901%2C223101%2C330101%2C290401%2C340501&needsCodes=14';
const checkUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&fw2=&pc=30&po1=25&po2=99&ta=13&sc=13101&sc=13102&sc=13103&sc=13104&sc=13105&sc=13113&sc=13109&sc=13110&sc=13112&sc=13114&sc=13115&sc=13120&sc=13203&sc=13204&sc=13210&ts=1&cb=15.0&ct=26.0&et=9999999&mb=55&mt=9999999&cn=20&co=1&tc=0401303&tc=0400101&tc=0400104&tc=0400301&tc=0401102&shkr1=03&shkr2=03&shkr3=03&shkr4=03';
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
  data: qs.stringify({
    message: `line通知`,
  })
};

scanPage = async (page) => {
  const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
  for (let btn of moreRoomsBtns) {
    await btn.click()
  }
  const roomLinks = await page.$$('//li[@class="building-room"]/a');
  for (let link of roomLinks) {
    const address = await link.getAttribute("href");
    console.log(address)
  }
}

(async () => {
  const browser = await playwright['chromium'].launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log("test")
  await page.goto(checkUrl);
  while (1) {
    await scanPage(page)
    const nextPageBtns = await page.$$('//div[@class="pagination-mediumController"]');
    const existNextPage = await nextPageBtns[1].$('//a')
    if (!existNextPage) {
      console.log('End of pages')
      break
    } else {
      console.log('Next page')
      await existNextPage.click()
    }
  }
  
  await browser.close();
})();

