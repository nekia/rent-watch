const playwright = require('playwright');
const Redis = require("ioredis");

const utils = require('./utils')
const Homes = require('./index-homes')
const Suumo = require('./index-suumo')
const RStore = require('./index-rstore')
const setting = require('./setting')

//const redis = new Redis(); // uses defaults unless given configuration object
const redis = new Redis('192.168.2.132', 31951); // uses defaults unless given configuration object

// エリア: 港区/渋谷区/新宿区/文京区/千代田区/目黒区/世田谷区/杉並区/中野区/豊島区/練馬区/板橋区
// エリア: 東京都下
// 賃料: 15 - 25
// 専有面積: 50 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き/定期借家を含まない
const checkUrl = 'https://www.mitsui-chintai.co.jp/rf/result?ku=(1,22),(1,10),(1,11),(1,21),(1,23),(1,14),(1,12),(1,19),(1,18),(1,20),(1,3)&kn=2&res=150&reb=250&ms=(50,0)&dir=3&flo=2&cms=1dvxwqtyww&get=ward';


scanRoomDetail = async (context, address) => {
  const roomPage = await context.newPage();
  let price = 0.0, size = 0.0, floorLevel = {}, location = "";
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    price = await getPriceFloat(roomPage)
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

getPriceFloat = async (page) => {
  const priceStr = await page.$('//ul[contains(@class, "tblBCmn") and contains(@class, "listRoom")]//li[contains(@class, "rent")]').then((elm) => elm.innerText())
  const priceNoUnit = priceStr.match(/[\d,]+/);
  return parseInt(priceNoUnit[0].replace(/,/g, ''))/10000
}

getSizeFloat = async (page) => {
  const roomSizeStr = await page.$('//dl[contains(@class, "square")]/dd/span[contains(@class, "sqm")]')
    .then( elm => elm.innerText() )
    .then( str => str.match(/[\d.]+/))
  return parseFloat(roomSizeStr[0])
}

getFloorLevel = async (page) => {
  const floorLevel = await page.$('//header/h2')
    .then((elm) => elm.innerText())
    .then((str) => str.match(/([\d]+)階/))

  const floorTopLevel = await page.$('//dt[text()[contains(., "規模構造")]]/following-sibling::dd[1]')
    .then((elm) => elm.innerText())
    .then((str) => str.match(/地上([\d]+)階/))

  return { floorLevel: parseInt(floorLevel[1]), floorTopLevel: parseInt(floorTopLevel[1]) }
}

getLocation = async (page) => {
  const addressStr = await page.$('//dl[contains(@class, "access")]//li[contains(@class, "addr")]')
    .then( elm => elm.innerText() )
    .then( str => str.trim() )
  return addressStr
}

scanRoom = async (context, page) => {
  const roomLinks = await page.$$('//section[contains(@class, "matoriProp")]/a[1]')
  
  const notifys = [];
  for (let i = 0; i < roomLinks.length; i++ ) {
    const link = roomLinks[i];
    const pathAddress = await link.getAttribute("href");
    console.log(pathAddress)
    if (await redis.exists(pathAddress)) {
      console.log('Already notified', pathAddress)
      continue
    }
    const detailObj = await scanRoomDetail(context, pathAddress)
    if (detailObj.location.length == 0) {
      continue;
    }
    const key = utils.createKeyFromDetail(detailObj)
    if (!await redis.exists(key)) {
      if (utils.meetCondition(detailObj)) {
        notifys.push(detailObj)
        console.log(pathAddress, key)
      } else {
        console.log('Doesn\'t meet the condition', key)
      }
    } else {
      console.log('Already notified', key)
      await redis.set(detailObj.address, 1)
    }
  }
  return notifys;
};

pagenation = async (page) => {
  try {
    const nextPageBtn = await page.$('//ul[@class="pagination"]/li/a[contains(text(), "»")]');
    if (!nextPageBtn) {
      console.log('End of pages')
      return { nextPageExist: false, nextPage: page };
    } else {
      console.log('Next page')
      await nextPageBtn.click()
      await page.waitForTimeout(5000)
      return { nextPageExist: true, nextPage: page };
    }
  } catch (error) {
    console.error('Failed to pagenate', error)
    return { nextPageExist: false, nextPage: undefined }
  }
}

(async () => {
  // const browser = await playwright['chromium'].launch({ headless: false });
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await utils.getNewContext(browser);
  let page = await context.newPage();

  let notifyRooms = [];
  console.log(`##### Start - Mitsui`);
  await page.goto(checkUrl);

  await page.$('//a[contains(@class, "closePopup")]').then((btn) => btn.click())
  await page.$('//a[contains(@class, "matori") and contains(@class, "btn")]').then((btn) => btn.click())
  await page.waitForTimeout(3000)
  
  while (1) {
    const rooms = await scanRoom(context, page)

    // Pagenation
    notifyRooms.push(...rooms)
    const { nextPageExist,  nextPage } = await pagenation(page)
    if (!nextPageExist) {
      break;
    } else {
      page = nextPage;
    }
  }

  for ( let i = 0; i < notifyRooms.length && i < setting.MAX_NOTIFIES_AT_ONCE; i++ ) {
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
  console.log(`##### Done - Mitsui`);

  await page.close()
  await browser.close();
  redis.disconnect()
})();
