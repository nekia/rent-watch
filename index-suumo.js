const utils = require('./utils')


// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/練馬区/板橋区/港区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 25
// 専有面積: 55 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き/定期借家含まない
// 情報の公開日: 本日の新着物件
const checkUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?url=%2Fchintai%2Fichiran%2FFR301FC001%2F&ar=030&bs=040&pc=30&smk=&po1=25&po2=99&tc=0401303&tc=0400101&tc=0400104&tc=0401106&shkr1=03&shkr2=03&shkr3=03&shkr4=03&cb=15.0&ct=25.0&et=9999999&mb=55&mt=9999999&cn=9999999&ta=13&sc=13101&sc=13103&sc=13104&sc=13105&sc=13113&sc=13109&sc=13110&sc=13112&sc=13114&sc=13115&sc=13120&sc=13116&sc=13203&sc=13204';

module.exports = class Suumo {
  constructor(browser, context) {
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return [checkUrl];
  }

  pagenation = async (page) => {
    try {
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
    } catch (error) {
      console.error('Failed to pagenate', error)
      return { nextPageExist: false, nextPage: undefined }
    }
  }

  scanRoomDetail = async (address) => {
    const roomPage = await utils.getNewPage(this.context);
    let price = 0.0, size = 0.0, floorLevel = {}, location = "", builtYear = 0;
    try {
      await roomPage.goto(address);
      await roomPage.waitForTimeout(1000)
      price = await this.getPriceFloat(roomPage)
      size = await this.getSizeFloat(roomPage)
      floorLevel = await this.getFloorLevel(roomPage)
      location = await this.getLocation(roomPage)
      builtYear = await this.getBuiltYear(roomPage)
    } catch (error) {
      console.warn('## Failed to retrieve the detail ##', address, error)
    } finally {
      await roomPage.close();
    }
    return { address, price, size, floorLevel, location, builtYear }
  }

  scanRoom = async (page) => {
    const eachDoorBtn = await page.$('//span[contains(@class, "fr_list-eachicon--door")]');
    await eachDoorBtn.click()
    await page.waitForTimeout(5000)
    const roomLinks = await page.$$('//h2[contains(@class, "property_inner-title")]/a')
    const notifys = [];
    for (let i = 0; i < roomLinks.length; i++ ) {
      console.log(`---------`)
      const link = roomLinks[i];
      const pathAddress = await link.getAttribute("href");
      const address = `https://suumo.jp${pathAddress}`;
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
    // 階建 | 8階/地下2地上31階建
    const floorLevel = await page.$('//th[text()[contains(., "階建")]]/following-sibling::td[1]')
    const floorLevelStr = await floorLevel.innerText()
    const floorLevelNoUnit = floorLevelStr.match(/[\d.]+/g);
    return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorLevelNoUnit[floorLevelNoUnit.length - 1])}
  }

  getLocation = async (page) => {
    const address = await page.$('//div[contains(@class, "property_view_detail--location")]/div[contains(@class, "property_view_detail-body")]/div')
    const addressStr = await address.innerText().then( result => result.trim() );
    return addressStr
  }

  getBuiltYear = async (page) => {
    const builtYrElm = await page.$('//th[text()="築年月"]/following-sibling::td[1]')
    return builtYrElm.innerText().then( (result) => {
      const builtYrStr = result.match(/(\d+)年/)
      return parseInt(builtYrStr[1])
    });
  }

  getSitename = () => { return 'Suumo' }

}
