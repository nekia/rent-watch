const playwright = require('playwright');
const Redis = require("ioredis");

const utils = require('./utils')

// const redis = new Redis(); // uses defaults unless given configuration object
const redis = new Redis(32089); // uses defaults unless given configuration object

const MAX_ROOM_PRICE = 220000;
const MIN_ROOM_SIZE = 57;
const MIN_FLOOR_LEVEL = 2;

const MAX_NOTIFIES_AT_ONCE = 200;

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/港区
// エリア: 東京都下
// 賃料: 15 - 25
// 専有面積: 50 -
// 駅徒歩分数: 15分以内
// 築年数: 20年以内
// こだわり: 2階以上/南向き/定期借家を含まない
const checkUrl = 'https://www.linea.co.jp/article/list/type/rent?url=&pre=area&search=&area%5B%5D=1&area%5B%5D=2&area%5B%5D=3&area%5B%5D=4&area%5B%5D=6';

scanRoomDetail = async (context, address) => {
  const roomPage = await context.newPage();
  let price = 0.0, size = 0.0, floorLevel = {}, location = "";
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    price = await getPriceInt(roomPage)
    size = await getSizeFloat(roomPage)
    floorLevel = await getFloorLevel(roomPage)
    location = await getLocation(roomPage)
    console.log(price, size, floorLevel, location)
  } catch (error) {
    console.warn('## Failed to retrieve the detail ##', address, error)
  } finally {
    await roomPage.close();
  }
  return { address, price, size, floorLevel, location }
};

scanRoom = async (context, address) => {
  const roomPage = await context.newPage();

  const notifys = [];
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    let roomLinks = await roomPage.$$('//article[contains(@class, "room-post")]/a')
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i];
      const roomAddress = await link.getAttribute("href");
      console.log(roomAddress)
      if (await redis.exists(roomAddress)) {
        console.log('Already notified', roomAddress)
        continue
      }
      const detailObj = await scanRoomDetail(context, roomAddress)
      if (detailObj.location.length == 0) {
        continue;
      }
      const key = utils.createKeyFromDetail(detailObj)
      if (!await redis.exists(key)) {
        if (detailObj.price <= MAX_ROOM_PRICE &&
            detailObj.size >= MIN_ROOM_SIZE &&
            detailObj.floorLevel.floorLevel != detailObj.floorLevel.floorTopLevel &&
            detailObj.floorLevel.floorLevel >= MIN_FLOOR_LEVEL ) {
          notifys.push(detailObj)
          console.log(pathAddress, key)
        } else {
          console.log('Too expensive and/or small', key)
        }
      } else {
        console.log('Already notified', key)
        await redis.set(detailObj.address, 1)
      }
    }
  } catch (error) {
    console.warn('## Failed to retrieve the room info ##', address, error)
  } finally {
    await roomPage.close();
  }
  return notifys
};

getPriceInt = async (page) => {
  const priceStr = await page.$('//ul[contains(@class, "room-main-floor-list")]/li[text()[contains(., "賃料")]]')
    .then( elm => elm.innerText())
    .then( str => str.match(/([\d,]+)円/) )
  return parseInt(priceStr[1].replace(/,/g, ''))
}

getSizeFloat = async (page) => {
  const roomSizeStr = await page.$('//ul[contains(@class, "room-main-floor-list")]/li[text()[contains(., "面積")]]')
    .then( elm => elm.innerText() )
    .then( str => str.match(/([\d.]+)㎡/))
  return parseFloat(roomSizeStr[1])
}

getFloorLevel = async (page) => {
  const floorLevel = await page.$('//div[contains(@class, "room-main-floor-name")]/a')
    .then( elm => elm.innerText() )
    .then( str => str.match(/(\d+)\d\d/))

  const floorLevellInt = floorLevel != null ? parseInt(floorLevel[1]) : 2;

  let floorTopLevelInt = 0;
  try {
    const floorTopLevel = await page.$('//ul[contains(@class, "apartment-header-listSpec")]/li[text()[contains(., "階")]]')
    .then(　elm => elm.innerText())
    .then(　str => str.match(/(\d+)階建*/))
    floorTopLevelInt = parseInt(floorTopLevel[1])
  } catch (error) {
    floorTopLevelInt = floorLevellInt + 1;
  }

  return { floorLevel: floorLevellInt, floorTopLevel: floorTopLevelInt }
}

getLocation = async (page) => {
  const addressStr = await page.$('//div[contains(@class, "spec-group-item")]//dt[text()[contains(., "所在地")]]/following-sibling::dd[1]')
    .then( elm => elm.innerText() )
    .then( str => str.trim() )
  return addressStr
}

scanBuilding = async (context, page) => {
  const roomLinks = await page.$$('//div[contains(@class, "pc-residence-row")]//a[contains(@class, "arrow")]')

  let notifyRooms = [];
  const notifys = [];
  for (let i = 0; i < roomLinks.length; i++ ) {
    try {
      const link = roomLinks[i];
      const pathAddress = await link.getAttribute("href");
      console.log(pathAddress)
      const rooms = await scanRoom(context, pathAddress)
      notifyRooms.push(...rooms)
    } catch (error) {
      console.warn('## Failed to retrieve the building info ##', address, error)
    }
  }
  return notifyRooms;
};

pagenation = async (page) => {
  const nextPageBtn = await page.$('//div[contains(@class, "pager")]/a[contains(@class, "page") and contains(@class, "is-current")]/following-sibling::a[contains(@class, "page")]')
  if (!nextPageBtn) {
    console.log('End of pages')
    return { nextPageExist: false, nextPage: page };
  } else {
    console.log('Next page')
    await nextPageBtn.click()
    await page.waitForTimeout(5000)
    return { nextPageExist: true, nextPage: page };
  }
}

(async () => {
  // const browser = await playwright['chromium'].launch({ headless: false });
  const browser = await playwright['chromium'].launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
  const context = await utils.getNewContext(browser);
  let page = await context.newPage();

  let notifyRooms = [];
  console.log(`##### Start - Linea`);
  await page.goto(checkUrl);
  await page.waitForTimeout(1000)

  while (1) {
    const rooms = await scanBuilding(context, page)

    notifyRooms.push(...rooms)

    // Pagenation
    const { nextPageExist,  nextPage } = await pagenation(page)
    if (!nextPageExist) {
      break;
    } else {
      page = nextPage;
    }
    await page.waitForTimeout(5000)
  }

  for ( let i = 0; i < notifyRooms.length && i < MAX_NOTIFIES_AT_ONCE; i++ ) {
    const key = utils.createKeyFromDetail(notifyRooms[i])
    if (!await redis.exists(key)) {
      await utils.notifyLine(notifyRooms[i])
      console.log('Notified (Paased redundant check)', key)
      await redis.set(key, 1)
      await redis.set(notifyRooms[i].address, 1)
    } else {
      console.log('Already notified (redundant check)', key)
    }
  }
  console.log(`##### Done - Linea`);

  await page.close()
  await browser.close();
  redis.disconnect()
})();
