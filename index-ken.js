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
  'https://www.kencorp.co.jp/housing/rent/search/result/?search_by=room&search_type=rent&page=1&per_page=10&areas=roppongi01&areas=roppongi02&areas=roppongi03&areas=roppongi04&areas=roppongi05&areas=shibuya01&areas=shibuya02&areas=shibuya03&areas=shibuya04&areas=shibuya05&areas=shibuya06&areas=meji01&areas=meji02&areas=meji03&areas=meji04&areas=meji05&areas=jiyu01&areas=jiyu03&areas=jiyu04&areas=jiyu02&areas=jiyu05&areas=jiyu06&areas=ginza01&areas=ginza02&areas=ginza03&areas=ginza04&areas=ginza05&areas=ginza06&areas=kichi01&areas=kichi02&areas=kichi03&areas=kichi04&areas=kichi05&rent_min=170000&rent_max=250000&rent_admin=1&footprint_min=50&build_type=apartment&kodawari=is_south_direction&kodawari=is_2nd_floor_higher&kodawari=excludes_fixed&sort_key=_created_at'
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
      const nextPageAnchor = await page.$('//div[contains(@class, "result-list") and not(@style="display: none;")]//span[text()="もっと見る"]/parent::a');
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
    let price = 0, size = 0.0, floorLevel = {}, location = "", builtYear = 0;
    try {
      await roomPage.goto(address)
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
    const notifys = [];

    while (true) {
      const { nextPageExist,  nextPage } = await this.pagenation(page)
      if (!nextPageExist) {
        break;
      } else {
        page = nextPage;
      }
    }

    const roomLinks = await page.$$('//div[contains(@class, "js-itemArea")]//a');
    for (let i = 0; i < roomLinks.length; i++ ) {
      console.log(`---------`)
      const addressPath = await roomLinks[i].getAttribute("href");
      const address = `https://www.kencorp.co.jp${addressPath}`
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
    const roomPriceElm = await page.$('//h2[text()="物件詳細"]/parent::div/parent::div/following-sibling::div//th[text()="賃料 / 管理費"]/following-sibling::td')
    const priceStr = await roomPriceElm.innerText();
    const priceNoUnit = priceStr.match(/[\d,]+/);
    return parseInt(priceNoUnit[0].replace(/,/g, '')) / 10000
  }

  getSizeFloat = async (page) => {
    const roomSizeElm = await page.$('//h2[text()="物件詳細"]/parent::div/parent::div/following-sibling::div//th[text()="専有面積"]/following-sibling::td')
    const roomSizeStr = await roomSizeElm.innerText()
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }

  getFloorLevel = async (page) => {
    // e.g. 3階 / 地上4階 地下1階建て
    const floorLevel = await page.$('//h2[text()="物件詳細"]/parent::div/parent::div/following-sibling::div//th[text()="階数"]/following-sibling::td')
    const floorLevelStr = await floorLevel.innerText()
    const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);
    return { floorLevel: parseInt(floorLevelNoUnit[floorLevelNoUnit.length - 1]), floorTopLevel: parseInt(floorLevelNoUnit[0]) }
  }

  getLocation = async (page) => {
    const address = await page.$('//h2[text()="物件詳細"]/parent::div/parent::div/following-sibling::div//th[text()="住所"]/following-sibling::td')
    const addressStr = await address.innerText().then( result => result.trim() );
    return addressStr
  }

  getBuiltYear = async (page) => {
    return page.$('//h2[text()="物件詳細"]/parent::div/parent::div/following-sibling::div//th[text()="竣工"]/following-sibling::td')
    .then( td => td.innerText() )
    .then( str => {
      const builtYrStr = str.match(/(\d+)年/)
      return parseInt(builtYrStr[1])
    })
  }

  getSitename = () => { return 'Ken Corporation' }

}
