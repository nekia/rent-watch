const utils = require('./utils')

const MAX_ROOM_PRICE = 20;
const MIN_ROOM_SIZE = 60;
const MIN_FLOOR_LEVEL = 2;

const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13101%2C13104%2C13105%2C13110%2C13112%2C13115%2C13114%2C13113%2C13116%2C13120%2C13203%2C13204%2C13211%2C13210%2C13214&monthMoneyRoom=16&monthMoneyRoomHigh=20&houseArea=60&walkMinutes=20&houseAgeHigh=20&newDate=3&mcfs=340102%2C340501&needsCodes=11%2C5&currentHouseArea=60';

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
    const nextPageBtns = await page.$$('//div[@class="pagination-mediumController"]');
    const existNextPage = await nextPageBtns[1].$('//a')
    if (!existNextPage) {
      console.log('End of pages')
      return { nextPageExist: false, page };
    } else {
      console.log('Next page')
      await existNextPage.click()
      await page.waitForTimeout(5000)
      return { nextPageExist: true, page };
    }
  }
  
  scanRoomDetail = async (address) => {
    console.log(address)
    const context = await utils.getNewContext(this.browser);
    const roomPage = await context.newPage();
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    const price = await this.getPriceFloat(roomPage)
    const size = await this.getSizeFloat(roomPage)
    const floorLevel = await this.getFloorLevel(roomPage)
    const location = await this.getLocation(roomPage)
    console.log(price, size, floorLevel, location)
    await roomPage.close();
    await context.close();
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
      const detailObj = await this.scanRoomDetail(address)
      const key = utils.createKeyFromDetail(detailObj)
      if (!await this.redis.exists(key)) {
        if (detailObj.price <= MAX_ROOM_PRICE &&
            detailObj.size >= MIN_ROOM_SIZE &&
            detailObj.floorLevel.floorLevel != detailObj.floorLevel.floorTopLevel &&
            detailObj.floorLevel.floorLevel >= MIN_FLOOR_LEVEL ) {
          notifys.push(detailObj)
          console.log(address, key)
        } else {
          console.log('Too expensive and/or small', key)
        }
      } else {
        console.log('Already notified', key)
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

