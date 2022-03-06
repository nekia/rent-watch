const utils = require('./utils')

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/練馬区/板橋区/港区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 25
// 専有面積: 55 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上
// 情報の公開日: 本日
const checkUrl = 'https://www.bluestudio.jp/rentsale/#!/rent/%E9%83%BD%E5%BF%83%E4%BA%94%E5%8C%BA,%E6%9D%B1%E4%BA%AC%E9%83%BD%E4%B8%8B/15%E3%80%9C20%E4%B8%87%E5%86%86,20%E3%80%9C25%E4%B8%87%E5%86%86/50%E3%80%9C70%E3%8E%A1,70%E3%80%9C100%E3%8E%A1/-/false/true/';

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
    const notifys = [];
    const roomPage = await utils.getNewPage(this.context);
    let price = 0, size = 0.0, floorLevel = { floorLevel: 99, floorTopLevel: 100 }, location = "";

    try {
      await roomPage.goto(address)
      // await roomPage.waitForTimeout(3000)
      await roomPage.waitForSelector('//h4[text()="Outline"]')

      let rooms = await roomPage.$$('//div[contains(@class, "summary")]/p[contains(@class, "map")]')
      for (let i = 0; i < rooms.length; i++) {
        let full = await rooms[i].$('//preceding-sibling::p[text()[contains(., "Full")]]')
        let detail = await rooms[i].$('//preceding-sibling::table')
        if (detail == undefined) {
          continue
        }
        console.log(`---------`)
        size = await this.getSizeFloat(detail)
        location = await this.getLocation(roomPage)

        if (full != undefined) {
          console.log('Full', size, '-', location)
          continue
        }

        price = await this.getPriceFloat(detail)
        let detailObj = { address, price, size, floorLevel, location }
        if (await utils.meetCondition(detailObj) ) {
          notifys.push(detailObj)
        } else {
          await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
        }
      }
    } catch (error) {
      console.warn('## Failed to retrieve the detail ##', address, error)
    } finally {
      await roomPage.close();
    }
    return notifys
  }

  scanRoom = async (page) => {
    let notifys = [];
    await page.waitForSelector('//article')
    let roomLinks = await page.$$('//article');
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i]
      const addressPath = await link.$('a').then((a) => a.getAttribute("href") )
      const address = `https://www.bluestudio.jp${addressPath}`
      const notifysArray = await this.scanRoomDetail(address)
      notifys = [...notifys, ...notifysArray]
    }
    return notifys;
  }

  getPriceFloat = async (detail) => {
    let priceStr = await detail.$('//th[text()[contains(., "賃料")]]/following-sibling::td').then( td => td.innerText() )
    const priceNoUnitStr = priceStr.match(/[\d,]+/);
    return parseInt(priceNoUnitStr[0].replace(/,/g, '')) / 10000
  }

  getSizeFloat = async (detail) => {
    const roomSizeStr = await detail.$('//th[text()="面積／間取り"]/following-sibling::td').then( td => td.innerText() )
    const roomSizeNoUnit = roomSizeStr.match(/[\d.]+/);
    return parseFloat(roomSizeNoUnit[0])
  }

  getLocation = async (page) => {
    return await page.$('//*[@id="normal"]/div[2]/div[2]/table[1]/tbody/tr[1]/td[2]').then( td => td.innerText()).then( result => result.trim() );
  }

  getSitename = () => { return 'Blue-Studio' }

}
