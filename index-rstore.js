const utils = require('./utils')

const MAX_ROOM_PRICE = 210000;
const MIN_ROOM_SIZE = 57;
const MIN_FLOOR_LEVEL = 2;

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/練馬区
// エリア: 武蔵野市/三鷹市/小金井市/小平市/国分寺市
// 賃料: 15 - 25
// 専有面積: 55 -
// 駅徒歩分数: 15分以内
// 築年数: 20年以内
// こだわり: 2階以上
// 情報の公開日: 本日
const checkUrl = 'https://www.r-store.jp/search/?&sb_get_full1=true&sb_purpose1%5B%5D=R&sb_r_min=150000&sb_r_max=250000&sb_walk_from=15&sb_area_up=55&sb_age_of_building=20&sb_kodawari_category%5B%5D=2%E9%9A%8E%E4%BB%A5%E4%B8%8A&sb_c%5B%5D=13101&sb_c%5B%5D=13104&sb_c%5B%5D=13105&sb_c%5B%5D=13113&sb_c%5B%5D=13110&sb_c%5B%5D=13112&sb_c%5B%5D=13114&sb_c%5B%5D=13115&sb_c%5B%5D=13120&sb_c%5B%5D=13116&sb_c%5B%5D=13203&sb_c%5B%5D=13204&sb_c%5B%5D=13210&sb_c%5B%5D=13211&sb_c%5B%5D=13214&sb_get_full2=true&sb_purpose2%5B%5D=RO&sb_purpose2%5B%5D=RS&sort_key=1&view_num=10&get_full=true';

module.exports = class Rstore {
  constructor(browser, context, redis) {
    this.redis = redis;
    this.browser = browser;
    this.context = context;
  }

  getCheckUrl = () => {
    return checkUrl;
  }

  pagenation = async (page) => {
    const nextPageAnchor = await page.$('//li[@class="page-nav-next"]/a');
    if (!nextPageAnchor) {
      console.log('End of pages')
      return { nextPageExist: false, nextPage: page };
    } else {
      console.log('Next page')
      await nextPageAnchor.click()
      await page.waitForTimeout(5000)
      return { nextPageExist: true, nextPage: page };
    }
  }

  scanRoomDetail = async (address) => {
    const roomPage = await this.context.newPage();
    await roomPage.goto(address)
    await roomPage.waitForTimeout(1000)
    const price = await this.getPriceInt(roomPage)
    const size = await this.getSizeFloat(roomPage)
    const floorLevel = await this.getFloorLevel(roomPage)
    const location = await this.getLocation(roomPage)
    console.log(price, size, floorLevel, location)
    await roomPage.close();
    return { address, price, size, floorLevel, location }
  }

  scanRoom = async (page) => {
    const notifys = [];
    const roomLinks = await page.$$('//div[contains(@class, "post-list")]');
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i]
      const anchor = await link.$('a')
      const addressPath = await anchor.getAttribute("href");
      const address = `https://r-store.jp${addressPath}`
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

  getPriceInt = async (page) => {
    const roomPriceElm = await page.$('//h3[text()[contains(., "賃料")]]/following-sibling::p[1]')
    const priceStr = await roomPriceElm.innerText();
    const priceNoUnit = priceStr.match(/[\d,]+/);
    return parseInt(priceNoUnit[0].replace(/,/g, ''))
  }

  getSizeFloat = async (page) => {
    const roomSizeElm = await page.$('//h3[text()[contains(., "面積")]]/following-sibling::p[1]')
    const roomSizeStr = await roomSizeElm.innerText()
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }

  getFloorLevel = async (page) => {
    // e.g. 鉄筋コンクリート造 地上3階建て
    // e.e. 鉄筋コンクリート造 地下1階 地上10階建て
    const floorTopLevel = await page.$('//h3[text()[contains(., "構造")]]/following-sibling::p[1]')
    const floorTopLevelStr = await floorTopLevel.innerText()
    const floorTopLevelNoUnit = floorTopLevelStr.match(/[\d]+/g);

    const floorLevel = await page.$('//h3[text()[contains(., "所在階")]]/following-sibling::p[1]')
    const floorLevelStr = await floorLevel.innerText()
    const floorLevelNoUnit = floorLevelStr.match(/[\d]+/g);

    return { floorLevel: parseInt(floorLevelNoUnit[0]), floorTopLevel: parseInt(floorTopLevelNoUnit.slice(-1))}
  }

  getLocation = async (page) => {
    const address = await page.$('//h3[text()[contains(., "所在地")]]/following-sibling::p[1]/a')
    const addressStr = await address.innerText().then( result => result.trim() );
    return addressStr
  }

  getSitename = () => { return 'R-Store' }

}