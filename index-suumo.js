const utils = require('./utils')


// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/練馬区/板橋区/港区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 25
// 専有面積: 55 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き/定期借家含まない
// 情報の公開日: 本日の新着物件
const checkUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&fw2=&pc=30&po1=25&po2=99&ta=13&sc=13101&sc=13103&sc=13104&sc=13105&sc=13113&sc=13110&sc=13112&sc=13114&sc=13115&sc=13120&sc=13116&sc=13119&sc=13204&sc=13210&cb=15.0&ct=25.0&et=9999999&mb=55&mt=9999999&cn=9999999&tc=0401303&tc=0400101&tc=0400104&tc=0401106&shkr1=03&shkr2=03&shkr3=03&shkr4=03';

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
      return { nextPageExist: false, nextPage: page };
    } else {
      console.log('Next page')
      await nextPageBtn.click()
      await page.waitForTimeout(5000)
      return { nextPageExist: true, nextPage: page };
    }
  }

  scanRoomDetail = async (address) => {
    const roomPage = await this.context.newPage();
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
    }
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
      if (await this.redis.exists(address)) {
        console.log('Already notified', address)
        continue
      }
      const detailObj = await this.scanRoomDetail(address)
      if (detailObj.location.length == 0) {
        continue;
      }
      const key = utils.createKeyFromDetail(detailObj)
      if (!await this.redis.exists(key)) {
        if ( utils.meetCondition(detailObj) ) {
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
