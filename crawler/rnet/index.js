const grpc = require('@grpc/grpc-js');
const playwright = require('playwright-chromium');
const nats = require('nats');

const setting = require('./setting/setting.json');
const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const cache_mgr_url = process.env.CACHE_MGR_URL ? process.env.CACHE_MGR_URL : "127.0.0.1:50051";

const clientCacheMgr = new services.CacheMgrClient(cache_mgr_url, grpc.credentials.createInsecure());

// エリア: 港区/渋谷区/新宿区/文京区/千代田区/目黒区/世田谷区/杉並区/中野区/豊島区/練馬区/板橋区
// エリア: 東京都下
// 賃料: 15 - 25
// 専有面積: 50 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き/定期借家を含まない
const checkUrl = setting.url;

openNConn = () => {
  // to create a connection to a nats-server:
  return nats.connect({ servers: nats_server_url });
}

publishRoom = (nc, url) => {
  const jc = nats.JSONCodec();
  nc.publish("rooms", jc.encode({ url: url, mode: setting.mode }));
}

closeNConn = async (nc) => {
  await nc.drain()
}

getNewContext = async (browser) => {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4595.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  await ctx.setDefaultTimeout(60000)
  return ctx;
}

getNewPage = async (context) => {
  return context.newPage()
}

checkCacheByUrl = async (url) => {
  return new Promise((resolv, reject) => {
    const request = new messages.CheckCacheByUrlRequest();
    request.setUrl(url);
    clientCacheMgr.checkCacheByUrl( request, function(err, response) {
      console.log('Completed checkCacheByUrl', response.getResult())
      resolv(response.getResult() != messages.CacheStatus.NOT_CACHED)
    });
  });
}

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

scanRoom = async (buildingElm) => {
  const nc = await openNConn();
  try {
    let roomPathArray = await buildingElm.$$('//li[contains(@class, "room-list-item")]/a')
      .then((anchors) => {
        const promises = [];
        for (a of anchors) {
          promises.push(a.getAttribute("href"))
        }
        return Promise.all(promises);
      });

    const roomLinks = roomPathArray.map(path => `https://www.rnt.co.jp${path}`)

    for (url of roomLinks) {
      if (await checkCacheByUrl(url)) {
        continue
      }
      publishRoom(nc, url)
    }

  } catch (error) {
    console.warn('## Failed to retrieve the room info ##', error)
  } finally {
    await closeNConn(nc);
  }
  return;
};

scanBuilding = async (page) => {
  const buildings = await page.$$('//div[@class="boxBuildingList"]')

  for (let i = 0; i < buildings.length; i++ ) {
    try {
      const buildingElm = buildings[i];
      const rooms = await scanRoom(buildingElm)
    } catch (error) {
      console.warn('## Failed to retrieve the building info ##', error)
    }
  }
  return;
};

(async () => {

  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await getNewContext(browser);
  let page = await getNewPage(context);

  console.log(`##### Start - R-net`);
  await page.goto(checkUrl);
  await page.waitForTimeout(1000)

  // Preparing for query
  await selectWard(page, "千代田区")
  await selectWard(page, "港区")
  await selectWard(page, "新宿区")
  await selectWard(page, "文京区")
  await selectWard(page, "品川区")
  await selectWard(page, "目黒区")
  await selectWard(page, "世田谷区")
  await selectWard(page, "渋谷区")
  await selectWard(page, "中野区")
  await selectWard(page, "杉並区")
  await selectWard(page, "豊島区")

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
    // await scanRoom(page)
    await scanBuilding(page)

    // Pagenation
    const { nextPageExist,  nextPage } = await pagenation(page)
    if (!nextPageExist) {
      break;
    } else {
      page = nextPage;
    }
    await page.waitForTimeout(5000)
  }

  console.log(`##### Done - R-net`);

  await page.close()
  await browser.close();
})();
