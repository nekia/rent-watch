const grpc = require('@grpc/grpc-js');
const playwright = require('playwright-chromium');
const nats = require('nats');

const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const cache_mgr_url = process.env.CACHE_MGR_URL ? process.env.CACHE_MGR_URL : "127.0.0.1:50051";

const clientCacheMgr = new services.CacheMgrClient(cache_mgr_url, grpc.credentials.createInsecure());

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/港区
// エリア: 東京都下
// 賃料: 15 - 25
// 専有面積: 50 -
// 駅徒歩分数: 15分以内
// 築年数: 20年以内
// こだわり: 2階以上/南向き/定期借家を含まない
const checkUrl = 'https://www.linea.co.jp/article/list/type/rent?pre2=1&pmi=10&pma=16&smi=6&sma=&req=&bye=4&name=';

openNConn = () => {
  // to create a connection to a nats-server:
  return nats.connect({ servers: nats_server_url });
}

publishRoom = (nc, url) => {
  const sc = nats.StringCodec();
  nc.publish("rooms", sc.encode(url));
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

scanRoom = async (context, address) => {
  const roomPage = await getNewPage(context);
  const nc = await openNConn();

  // const notifys = [];
  try {
    await roomPage.goto(address);
    let roomLinks = await roomPage.$$('//article[contains(@class, "room-post")]/a').then((roomLinks) => {
      const promises = [];
      for (link of roomLinks) {
        promises.push(link.getAttribute("href"));
      }
      return Promise.all(promises)
    })

    for (url of roomLinks) {
      if (await checkCacheByUrl(url)) {
        continue
      }
      publishRoom(nc, url)
    }
    
  } catch (error) {
    console.warn('## Failed to retrieve the room info ##', address, error)
  } finally {
    await roomPage.close();
    await closeNConn(nc);
  }
  return
  // return notifys
};

scanBuilding = async (context, page) => {
  const roomLinks = await page.$$('//div[contains(@class, "pc-residence-row")]//a[contains(@class, "arrow")]').then((roomLinks) => {
    const promises = [];
    for (link of roomLinks) {
      promises.push(link.getAttribute("href"));
    }
    return Promise.all(promises)
  })
  console.log('scanBuilding', roomLinks)
  for (pathAddress of roomLinks) {
    try {
      await scanRoom(context, pathAddress)
    } catch (error) {
      console.warn('## Failed to retrieve the building info ##', pathAddress, error)
    }
  }
  return;
};

pagenation = async (page) => {
  try {
    const nextPageBtn = await page.$('//div[contains(@class, "pager")]/a[contains(@class, "page") and contains(@class, "is-current")]/following-sibling::a[contains(@class, "page")]')
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

(async () => {

  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await getNewContext(browser);
  let page = await getNewPage(context);

  console.log(`##### Start - Linea`);
  await page.goto(checkUrl);
  await page.waitForTimeout(1000)

  while (1) {
    await scanBuilding(context, page)

    // Pagenation
    const { nextPageExist,  nextPage } = await pagenation(page)
    if (!nextPageExist) {
      break;
    } else {
      page = nextPage;
    }
    await page.waitForTimeout(5000)
  }

  console.log(`##### Done - Linea`);

  await page.close()
  await browser.close();
})();
