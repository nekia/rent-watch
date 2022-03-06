const utils = require('./utils')

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/練馬区/板橋区/港区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 25
// 専有面積: 55 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上
// 情報の公開日: 本日
const checkUrlArray = [
  'https://tokyo-designers.com/desingers/15-200000',
  'https://tokyo-designers.com/desingers/20-250000',
  'https://tokyo-designers.com/high-grade/15-200000',
  'https://tokyo-designers.com/high-grade/20-250000',
  'https://tokyo-designers.com/renovation/15-200000',
  'https://tokyo-designers.com/renovation/20-250000'
];

module.exports = class Rstore {
  constructor(browser, context) {
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return checkUrlArray;
  }

  pagenation = async (page) => {
    try {
      const nextPageAnchor = await page.$('//li[@class="next"]/a');
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
    let price = 0, size = 0.0, floorLevel = {}, location = "";
    try {
      await roomPage.goto(address)
      await roomPage.waitForTimeout(1000)
      price = await this.getPriceFloat(roomPage)
      size = await this.getSizeFloat(roomPage)
      floorLevel = await this.getFloorLevel(roomPage)
      location = await this.getLocation(roomPage)
    } catch (error) {
      console.warn('## Failed to retrieve the detail ##', address, error)
    } finally {
      await roomPage.close();
    }
    return { address, price, size, floorLevel, location }
  }

  scanRoom = async (page) => {
    const notifys = [];
    const roomLinks = await page.$$('//table[contains(@class, "room")]/tbody/tr[@class="clickableRow"]');
    for (let i = 0; i < roomLinks.length; i++ ) {
      console.log(`---------`)
      const link = await roomLinks[i].getAttribute('onclick');
      const addressPath = link.match(/'(.+)'/);
      const address = `https://tokyo-designers.com${addressPath[1]}`
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
    return notifys;
  }

  getPriceFloat = async (page) => {
    const roomPriceElm = await page.$('//th[text()[contains(., "賃料")]]/following-sibling::td')
    const priceStr = await roomPriceElm.innerText();
    const priceNoUnit = priceStr.match(/[\d,]+/);
    return parseInt(priceNoUnit[0].replace(/,/g, '')) / 10000
  }

  getSizeFloat = async (page) => {
    const roomSizeElm = await page.$('//th[text()[contains(., "専有面積")]]/following-sibling::td')
    const roomSizeStr = await roomSizeElm.innerText()
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }

  getFloorLevel = async (page) => {
    // e.g. 3階 / 地上4階 地下1階建て
    const floorLevel = await page.$('//th[text()="階"]/following-sibling::td')
    const floorLevelStr = await floorLevel.innerText()
    const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);
    return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorLevelNoUnit[1])}
  }

  getLocation = async (page) => {
    const address = await page.$('//th[text()="所在地"]/following-sibling::td')
    const addressStr = await address.innerText().then( result => result.trim() );
    return addressStr
  }

  getSitename = () => { return 'Tokyo-Designers' }

}
