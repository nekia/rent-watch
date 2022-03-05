const utils = require('./utils')

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/練馬区/板橋区/港区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 25
// 専有面積: 55 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上
// 情報の公開日: 本日
const checkUrl = 'https://www.t-p-o.com/rent/?type=rent&area_id%5B%5D=1301&area_id%5B%5D=1302&area_id%5B%5D=1303&area_id%5B%5D=1304&area_id%5B%5D=1305&area_id%5B%5D=1306&area_id%5B%5D=1307&area_id%5B%5D=1308&area_id%5B%5D=1309&area_id%5B%5D=1310&area_id%5B%5D=1311&area_id%5B%5D=1312&area_id%5B%5D=1313&area_id%5B%5D=1314&area_id%5B%5D=1316&area_id%5B%5D=1300&price_min=160000&price_max=240000&exclusive_area_min=55&exclusive_area_max=100&property_name=';

module.exports = class Rstore {
  constructor(browser, context) {
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return checkUrl;
  }

  pagenation = async (page) => {
    try {
      const nextPageAnchor = await page.$('//a[@class="moreLoad"]');
      if (!nextPageAnchor) {
        console.log('End of pages')
        return { nextPageExist: false, nextPage: page };
      } else {
        console.log('Next page')
        await nextPageAnchor.click()
        await page.waitForTimeout(5000)
        return { nextPageExist: true, nextPage: page };
      }
    } catch (error) {
      console.error('Failed to pagenate', error)
      return { nextPageExist: false, nextPage: undefined }
    }
  }

  scanRoomDetail = async (address) => {
    const roomPage = await utils.getNewPage(this.context);
    let price = 0, size = 0.0, floorLevel = { floorLevel: 99, floorTopLevel: 100 }, location = "";

    try {
      await roomPage.goto(address)
      await roomPage.waitForTimeout(3000)

      let rented = await roomPage.$('//div[text()[contains(., "申込み有")]]')
      if (rented != undefined) {
        console.log('Sold out')
        await roomPage.close();
        return { address, price, size, floorLevel, location }
      }
  
      price = await this.getPriceFloat(roomPage)
      size = await this.getSizeFloat(roomPage)
      // floorLevel = await this.getFloorLevel(roomPage)
      location = await this.getLocation(roomPage)
    } catch (error) {
      console.warn('## Failed to retrieve the detail ##', address, error)
    } finally {
      await roomPage.close();
    }
    return { address, price, size, floorLevel, location }
  }

  scanRoomDetailNested = async (apartAddress) => {
    const notifys = [];

    const roomsPage = await utils.getNewPage(this.context);
    await roomsPage.goto(apartAddress)
    await roomsPage.waitForTimeout(3000)

    const roomLinks = await roomsPage.$$('//ul[@id="rooms"]/li[contains(@class, "property")]/div[contains(@class, "propertyInfo")]')
    for (let i = 0; i < roomLinks.length; i++ ) {
      console.log(`---------`)
      const link = roomLinks[i]
      const addressPath = await link.$('a').then((a) => a.getAttribute("href") )
      const address = `https://www.t-p-o.com${addressPath}`

      if (await utils.checkCacheByUrl(address)) {
        continue
      }
      const detailObj = await this.scanRoomDetail(address)
      if (detailObj.location.length == 0) {
        continue;
      }

      if (await utils.meetCondition(detailObj) ) {
        notifys.push(detailObj)
      } else {
        await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
      }

    }
    await roomsPage.close();
    return notifys;
  }

  scanRoom = async (page) => {
    let notifys = [];
    await page.waitForSelector('//ul[contains(@class, "propertys")]')
    let roomLinks = await page.$$('//li[contains(@class, "mProperty") and contains(@class, "property") and not(contains(@class, "multi"))]');
    for (let i = 0; i < roomLinks.length; i++ ) {
      console.log(`---------`)
      const link = roomLinks[i]
      const addressPath = await link.$('a').then((a) => a.getAttribute("href") )
      const address = `https://www.t-p-o.com${addressPath}`
      if (await utils.checkCacheByUrl(address)) {
        continue
      }
      const detailObj = await this.scanRoomDetail(address)
      if (detailObj.location.length == 0) {
        continue;
      }

      if (await utils.meetCondition(detailObj) ) {
        notifys.push(detailObj)
      } else {
        await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
      }
    }

    roomLinks = await page.$$('//li[contains(@class, "mProperty") and contains(@class, "property") and contains(@class, "multi")]');
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i]
      const addressPath = await link.$('a').then((a) => a.getAttribute("href") )
      const address = `https://www.t-p-o.com${addressPath}`
      const notifysArray = await this.scanRoomDetailNested(address)
      notifys = [...notifys, ...notifysArray]
    }
    return notifys;
  }

  getPriceFloat = async (page) => {
    const priceStr = await page.$('//li[text()[contains(., "賃料：")]]').then((li) => li.innerText() )
    const priceNoUnit = priceStr.match(/[\d,]+/);
    return parseInt(priceNoUnit[0].replace(/,/g, '')) / 10000
  }

  getSizeFloat = async (page) => {
    const roomSizeStr = await page.$('//li[text()[contains(., "面積：")]]').then((li) => li.innerText())
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }

  getFloorLevel = async (page) => {
    // e.g. 鉄筋コンクリート造 地上3階建て
    // e.e. 鉄筋コンクリート造 地下1階 地上10階建て
    const floorTopLevelStr = await page.$('//li[text()[contains(., "規模：")]]').then((li) => li.innerText())
    const floorTopLevelNoUnit = floorTopLevelStr.match(/[\d]+/g);

    // const floorLevel = await page.$('//h3[text()[contains(., "所在階")]]/following-sibling::p[1]')
    // const floorLevelStr = await floorLevel.innerText()
    // const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);

    return { floorLevel: 0, floorTopLevel: parseInt(floorTopLevelNoUnit.slice(-1))}
  }

  getLocation = async (page) => {
    return await page.$('//div[contains(@class, "roomAddress")]/p[1]').then((p) => p.innerText()).then( result => result.trim() );
  }

  getSitename = () => { return 'T-P-O' }

}
