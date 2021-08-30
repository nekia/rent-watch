const playwright = require('playwright');

const checkUrl = 'https://www.linea.co.jp/article/room/type/rent/id/304/rid';
(async () => {
  const browser = await playwright['chromium'].launch();
  const context = await browser.newContext();
  for ( let roomNum = 2080; roomNum < 2090; roomNum++ ) {
    const page = await context.newPage();
    await page.goto(`${checkUrl}/${roomNum}`);
    await page.screenshot({ path: `room-${roomNum}.png` });
    await page.close();
  }
  await browser.close();
})();