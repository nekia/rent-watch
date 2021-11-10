const utils = require('./utils')

const MAX_ROOM_PRICE = 20;
const MIN_ROOM_SIZE = 60;
const MIN_FLOOR_LEVEL = 2;

const checkUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&ta=13&sc=13101&sc=13104&sc=13105&sc=13113&sc=13110&sc=13112&sc=13114&sc=13115&sc=13120&sc=13116&sc=13203&sc=13204&sc=13210&sc=13211&sc=13214&cb=16.0&ct=20.0&et=15&cn=20&mb=60&mt=9999999&tc=0401303&tc=0400101&tc=0400104&shkr1=03&shkr2=03&shkr3=03&shkr4=03&fw2=&srch_navi=1';

module.exports = class Suumo {
  constructor(browser, context, redis) {
    this.redis = redis;
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return checkUrl;
  }

  pagenation = async (page) => {
    const nextPageBtn = await page.$('//p[@class="pagination-parts"]/a[contains(text(), "次へ")]');
    if (!nextPageBtn) {
      console.log('End of pages')
      return { nextPageExist: false, page };
    } else {
      console.log('Next page')
      await nextPageBtn.click()
      await page.waitForTimeout(5000)
      return { nextPageExist: true, page };
    }
  }

  scanRoomDetail = async (address) => {
    const roomPage = await this.context.newPage();
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    const price = await this.getPriceFloat(roomPage)
    const size = await this.getSizeFloat(roomPage)
    const floorLevel = await this.getFloorLevel(roomPage)
    const location = await this.getLocation(roomPage)
    console.log(price, size, floorLevel, location)
    await roomPage.close();
    return { address, price, size, floorLevel, location }
  }

  scanRoom = async (page) => {
    const eachDoorBtn = await page.$('//span[contains(@class, "fr_list-eachicon--door")]');
    await eachDoorBtn.click()
    await page.waitForTimeout(5000)
    const roomLinks = await page.$$('//h2[contains(@class, "property_inner-title")]/a')
    const notifys = [];
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i];
      const pathAddress = await link.getAttribute("href");
      const address = `https://suumo.jp${pathAddress}`;
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
    const roomPriceElm = await page.$('//div[contains(@class, "property_view_main-emphasis")]')
    const priceStr = await roomPriceElm.innerText();
    const priceWoUnit = priceStr.match(/[\d.]+/);
    return parseFloat(priceWoUnit[0])
  }

  getSizeFloat = async (page) => {
    const roomSizeElm = await page.$('//div[text()[contains(., "専有面積")]]/following-sibling::div[contains(@class, "property_data-body")]')
    const roomSizeStr = await roomSizeElm.innerText()
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }

  getFloorLevel = async (page) => {
    const floorLevel = await page.$('//th[text()[contains(., "階建")]]/following-sibling::td[1]')
    const floorLevelStr = await floorLevel.innerText()
    const floorLevelNoUnit = floorLevelStr.match(/[\d.]+/g);
    return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorLevelNoUnit[1])}
  }

  getLocation = async (page) => {
    const address = await page.$('//div[contains(@class, "property_view_detail--location")]/div[contains(@class, "property_view_detail-body")]/div')
    const addressStr = await address.innerText().then( result => result.trim() );
    return addressStr
  }

  getSitename = () => { return 'Suumo' }

}