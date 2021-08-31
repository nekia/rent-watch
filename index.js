const playwright = require('playwright');
const axios = require('axios');
const qs = require('querystring');

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

const checkUrl = 'https://www.linea.co.jp/article/roomlist/type/rent/id/304/fl/all';
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

(async () => {
  const browser = await playwright['chromium'].launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(checkUrl);
  const rooms = await page.$$('.room-number');
  for (let room of rooms) {
    const roomNumber = await room.innerText();
    for (const watch of watchLists.rooms) {
      if (roomNumber.includes(watch.number)) {
        console.log(`Available: room ${watch.number} !!`)
        config.data = qs.stringify({
          message: `${roomNumber}号室が空いてます! ${checkUrl}`,
        })
        const response = await axios.request(config);
        // console.log(response)
      }
    }
    console.log(roomNumber)
  }
  // await page.screenshot({ path: `all-lists.png` });

  for (const watch of watchLists.rooms) {
    const watchUrl = `${roomUrl}/${watch.id}`;
    await page.goto(watchUrl);
    const roomSpecs = await page.$$('//ul[@class="room-main-floor-list"]/li')
    const rent = await roomSpecs[0].innerText();
    if ( !rent.includes('未定')　) {
      console.log(`Preparing room [${watch.number}] ${rent} !!`)
      config.data = qs.stringify({
        message: `${watch.number}号室が準備中です! ${rent} : ${watchUrl}`,
      })
      const response = await axios.request(config);
  }
    // await page.screenshot({ path: `room-${watch.number}.png` });
  }
  await browser.close();
})();