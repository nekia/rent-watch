const utils = require('./utils')

// エリア: 千代田区/港区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/板橋区/練馬区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 30
// 専有面積: 60 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き
// 情報の公開日: 本日
const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13101%2C13104%2C13105%2C13110%2C13112%2C13113%2C13114%2C13115%2C13116%2C13203%2C13204%2C13210%2C13214%2C13120%2C13103%2C13119&monthMoneyRoom=15&monthMoneyRoomHigh=30&houseArea=50&walkMinutes=0&houseAgeHigh=0&newDate=1&mcfs=340102%2C340501&needsCodes=5';

module.exports = class Homes {
  constructor(browser, context, redis) {
    this.redis = redis;
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return checkUrl;
  }
  
  pagenation = async (page) => {
    try {
      const nextPageBtns = await page.$$('//div[@class="pagination-mediumController"]');
      const existNextPage = await nextPageBtns[1].$('//a')
      if (!existNextPage) {
        console.log('End of pages')
        return { nextPageExist: false, nextPage: page };
      } else {
        console.log('Next page')
        await existNextPage.click()
        await page.waitForTimeout(5000)
        return { nextPageExist: true, nextPage: page };
      }
    } catch (error) {
      console.error('Failed to pagenate', error)
      return { nextPageExist: false, nextPage: undefined }
    }
  }
  
  scanRoomDetail = async (address) => {
    console.log(address)
    const context = await utils.getNewContext(this.browser);
    const roomPage = await context.newPage();
    let price = 0.0, size = 0.0, floorLevel = {}, location = "";
    try {
      await roomPage.goto(address);
      await roomPage.waitForTimeout(1000)
      price = await this.getPriceFloat(roomPage)
      size = await this.getSizeFloat(roomPage)
      floorLevel = await this.getFloorLevel(roomPage)
      location = await this.getLocation(roomPage)
      console.log(price, size, floorLevel, location)
    } catch (error) {
      console.warn('## Failed to retrieve the detail ##', address, error)
    } finally {
      await roomPage.close();
      await context.close();
    }
    return { address, price, size, floorLevel, location }
  }
  
  scanRoom = async (page) => {
    const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
    for (let btn of moreRoomsBtns) {
      await btn.click()
    }
    const notifys = [];
    const roomLinks = await page.$$('//li[@class="building-room"]/a');
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i]
      const address = await link.getAttribute("href");
      if (await this.redis.exists(address)) {
        console.log('Already notified', address)
        continue
      }
      const detailObj = await this.scanRoomDetail(address)
      if (detailObj.location.length == 0) {
        continue
      }
      const key = utils.createKeyFromDetail(detailObj)
      if (!await this.redis.exists(key)) {
        if (await utils.meetCondition(detailObj)) {
          notifys.push(detailObj)
          console.log(address, key)
        } else {
          console.log('Doesn\'t meet the condition', key)
        }
      } else {
        console.log('Already notified', key)
        await this.redis.set(detailObj.address, 1)
      }
    }
    return notifys;
  }
  
  getPriceFloat = async (page) => {
    const roomPriceElm = await page.$('//th[text()[contains(., "賃料（管理費等）")]]/following-sibling::td/div/div[1]/span/span')
    const priceStr = await roomPriceElm.innerText();
    const priceWoUnit = priceStr.match(/[\d.]+/);
    return parseFloat(priceWoUnit[0])
  }
  
  getSizeFloat = async (page) => {
    const roomSizeElm = await page.$('//span[text()[contains(., "専有面積")]]/parent::*/following-sibling::dd[1]')
    const roomSizeStr = await roomSizeElm.innerText()
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }
  
  getFloorLevel = async (page) => {
    const floorLevel = await page.$('//th[text()[contains(., "所在階 / 階数")]]/following-sibling::td[1]')
    const floorLevelStr = await floorLevel.innerText()
    const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);
    return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorLevelNoUnit[1])}
  }
  
  getLocation = async (page) => {
    const address = await page.$('//span[text()[contains(., "所在地")]]/parent::*/following-sibling::dd[1]')
    const addressStr = await address.innerText().then( result => result.trim().split('\n')[0] );
    return addressStr
  }

  getSitename = () => { return 'Homes' }
}

