const playwright = require('playwright');

const utils = require('./utils')
const setting = require('./setting')

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/港区/板橋区/練馬区
// エリア: 東京都下
// 賃料: 15 - 25
// 専有面積: 50 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き/定期借家を含まない
const checkUrl = 'https://www.rnt.co.jp/search/address/';

scanRoom = async (buildingElm) => {
  const location = await getLocation(buildingElm);
  const floorTopLevel = await getFloorTopLevel(buildingElm);
  const builtYear = await getBuiltYear(buildingElm)
  let address = '';
  const rooms = [];
  try {
    let roomElms = await buildingElm.$$('//li[contains(@class, "room-list-item")]/a')
    for (let i = 0; i < roomElms.length; i++ ) {
      console.log(`---------`)
      const roomElm = roomElms[i];
      address = await roomElm.getAttribute("href")
        .then( path => `https://www.rnt.co.jp${path}` )
      if (await utils.checkCacheByUrl(address)) {
        continue
      }
      const floorLevel = await getFloorLevel(roomElm)
      const size = await getSize(roomElm)
      const price = await getPrice(roomElm)
      const detailObj = {
        address,
        price,
        size,
        location,
        floorLevel: {
          floorLevel,
          floorTopLevel
        },
        builtYear
      };
      if (await utils.meetCondition(detailObj)) {
        rooms.push(detailObj)
      } else {
        await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
      }
    }
  } catch (error) {
    console.warn('## Failed to retrieve the room info ##', address, error)
  }
  return rooms
};

getPrice = async (roomElm) => {
  return roomElm.$('//span[text()[contains(., "管理費")]]/preceding-sibling::span[1]')
    .then( elm => elm.innerText())
    .then( str => str.match(/([\d.]+)万円/) )
    .then( ret => parseFloat(ret[1]) );
}

getSize = async (roomElm) => {
  return roomElm.$('//div[text()[contains(., "m²")]]')
    .then( elm => elm.innerText())
    .then( str => str.match(/([\d.]+)m²/) )
    .then( ret => parseFloat(ret[1]) );
}

getFloorLevel = async (roomElm) => {
  return roomElm.$('//div[text()[contains(., "階")]]')
    .then( elm => elm.innerText())
    .then( str => str.match(/([\d]+)階/) )
    .then( ret => parseInt(ret[1]) );
}

getFloorTopLevel = async (buildingElm) => {
  return buildingElm.$('//div[contains(@class, "building-list-detail")]//dd[text()[contains(., "地上")]]')
    .then( elm => elm.innerText())
    .then( str => str.match(/地上\s*([\d]+)\s*階/) )
    .then( ret => parseInt(ret[1]) );
}

getLocation = async (buildingElm) => {
  return buildingElm.$('//dt[text()[contains(., "所在地")]]/following-sibling::dd[1]')
    .then( elm => elm.innerText())
    .then( str => str.match(/^\s*(.+)\s*（/) )
    .then( ret => ret[1].replace(/\s/g, ''));
}

getBuiltYear = async (buildingElm) => {
  return buildingElm.$('//dt[text()="築年月"]/following-sibling::dd[1]')
    .then( elm => elm.innerText())
    .then( str => {
      const builtYrStr = str.match(/(\d+)年/)
      return parseInt(builtYrStr[1])
  })
}

scanBuilding = async (context, page) => {
  const buildings = await page.$$('//div[@class="boxBuildingList"]')

  let notifyRooms = [];
  const notifys = [];
  for (let i = 0; i < buildings.length; i++ ) {
    try {
      const buildingElm = buildings[i];
      const rooms = await scanRoom(buildingElm)
      notifyRooms.push(...rooms)
    } catch (error) {
      console.warn('## Failed to retrieve the building info ##', error)
    }
  }
  return notifyRooms;
};

pagenation = async (page) => {
  try {
    const nextPageBtn = await page.$('//li[contains(@class, "next") and not(contains(@class, "disabled"))]/a[text()=">"]')
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

selectWard = async (page, label) => {
  return await page.$('//a[text()[contains(., "' + label + '")]]/parent::label[1]/preceding-sibling::input[1]')
    .then( checkbox => checkbox.click() )
};

selectKodawari = async (page, label) => {
  return await page.$('//label[text()[contains(., "' + label + '")]]/preceding-sibling::input[1]')
    .then( checkbox => checkbox.click() )
};

(async () => {
  try {
    // const browser = await playwright['chromium'].launch({ headless: false });
    const browser = await playwright['chromium'].launch({ headless: true });
    const context = await utils.getNewContext(browser);
    let page = await utils.getNewPage(context);

    let notifyRooms = [];
    console.log(`##### Start - R-Net`);
    await page.goto(checkUrl);
    await page.waitForTimeout(1000)

    // Preparing for query
    await selectWard(page, "千代田区")
    await selectWard(page, "港区")
    await selectWard(page, "新宿区")
    await selectWard(page, "文京区")
    await selectWard(page, "品川区")
    await selectWard(page, "目黒区")
    await selectWard(page, "大田区")
    await selectWard(page, "世田谷区")
    await selectWard(page, "渋谷区")
    await selectWard(page, "中野区")
    await selectWard(page, "杉並区")
    await selectWard(page, "豊島区")
    await selectWard(page, "練馬区")

    await page.$('//select[contains(@id, "SearchPriceMin")]')
      .then( select => select.selectOption({ label: "15万円"}) )
    await page.$('//select[contains(@id, "SearchPriceMax")]')
      .then( select => select.selectOption({ label: "25万円"}) )
    await page.$('//select[contains(@id, "SearchRoomAreaMin")]')
      .then( select => select.selectOption({ label: "50平米"}) )


    await selectKodawari(page, "15畳以上")
    await selectKodawari(page, "2階以上")
    await selectKodawari(page, "南向き")

    await page.$('//a[text()[contains(., "この条件で検索する")]]')
      .then( btn => btn.click() )
    await page.waitForTimeout(5000)

    while (1) {
      const rooms = await scanBuilding(context, page)

      notifyRooms.push(...rooms)

      if (utils.getNewPageCount() > setting.MAX_NEW_PAGE_COUNT) {
        console.log('Reached max new page count', utils.getNewPageCount())
        break
      }

      // Pagenation
      const { nextPageExist,  nextPage } = await pagenation(page)
      if (!nextPageExist) {
        break;
      } else {
        page = nextPage;
      }
      await page.waitForTimeout(5000)
    }

    for ( let i = 0; i < notifyRooms.length && i < setting.MAX_NOTIFIES_AT_ONCE; i++ ) {
      const key = utils.createKeyFromDetail(notifyRooms[i])
      if (!await utils.checkCacheByKey(key)) {
        await utils.notifyLine(notifyRooms[i])
        console.log('Notified (Paased redundant check)', key)
      }
      await utils.addCache(notifyRooms[i], utils.CACHE_KEY_VAL_NOTIFIED)
    }
    console.log(`##### Done - R-Net`);

    await page.close()
    await browser.close();
    await utils.disconnectCache()
  } catch (error) {
    console.error('Aborted with error', error)
    await page.close()
    await browser.close();
    await utils.disconnectCache()
  }
})();
  
