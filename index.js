const playwright = require('playwright');
const axios = require('axios');
const qs = require('querystring');


const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

const checkUrl = 'https://www.linea.co.jp/article/roomlist/type/rent/id/304/fl/all';
const watchLists = [
  '201',
  '301',
  '401',
  '501',
  '601',
  '603',
  '701',
  '801',
  '802'
];

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
  for ( let room of rooms ) {
    const roomNumber = await room.innerText();
    for ( const watch of watchLists ) {
      if ( roomNumber.includes(watch) ) {
        console.log(`Available: room ${watch} !!`)
        config.data = qs.stringify({
          message: `${roomNumber}号室が空いてます! ${checkUrl}`,
        })
        const response = await axios.request(config);
        // console.log(response)
      }
    }
    console.log(roomNumber)
  }
  await page.screenshot({ path: `all-lists.png` });
  await browser.close();
})();