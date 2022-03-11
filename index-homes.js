const utils = require('./utils')

// エリア: 千代田区/港区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/板橋区/練馬区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 30
// 専有面積: 60 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き
// 情報の公開日: 本日
const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?prefectureId=13&cityIds=13101%2C13102%2C13103%2C13104%2C13105%2C13109%2C13110%2C13111%2C13112%2C13113%2C13114%2C13115%2C13116%2C13120%2C13203%2C13204&monthMoneyRoom=15&monthMoneyRoomHigh=30&moneyMaintenanceInclude=1&houseArea=50&newDate=1&mcfs=340501%2C340102&wantMcfs=113601%2C263101%2C293101&needsCodes=15';

module.exports = class Homes {
  constructor(browser, context) {
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return [checkUrl];
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
    const context = await utils.getNewContext(this.browser);
    const roomPage = await utils.getNewPage(context);
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
      await context.close();
    }
    return { address, price, size, floorLevel, location, builtYear }
  }
  
  scanRoom = async (page) => {
    const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
    for (let btn of moreRoomsBtns) {
      await btn.click()
    }
    const notifys = [];
    const roomLinks = await page.$$('//li[@class="building-room"]/a');
    for (let i = 0; i < roomLinks.length; i++ ) {
      console.log(`---------`)
      const link = roomLinks[i]
      const address = await link.getAttribute("href");
      if (await utils.checkCacheByUrl(address)) {
        continue
      }
      const detailObj = await this.scanRoomDetail(address)
      if (detailObj.location.length == 0) {
        continue
      }

      if (await utils.meetCondition(detailObj)) {
        notifys.push(detailObj)
      } else {
        await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
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
    // 所在階 / 階数 | 2階 / 12階建 (地下1階)
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

  getBuiltYear = async (page) => {
    const builtYrElm = await page.$('//dd[@id="chk-bkc-kenchikudate"]')
    return builtYrElm.innerText().then( (result) => {
      const builtYrStr = result.match(/(\d+)年/)
      return parseInt(builtYrStr[1])
    });
  }

  getSitename = () => { return 'Homes' }
}

