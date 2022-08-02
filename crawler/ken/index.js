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

scanRoom = async (page) => {
  const nc = await openNConn();

  while (true) {
    const { nextPageExist,  nextPage } = await pagenation(page)
    if (!nextPageExist) {
      break;
    } else {
      page = nextPage;
    }
  }

  try {
    const roomPathArray = await page.$$('//div[contains(@class, "js-itemArea")]//a')
      .then((anchors) => {
        const promises = [];
        for (a of anchors) {
          promises.push(a.getAttribute("href"))
        }
        return Promise.all(promises);
      });

    const roomLinks = roomPathArray.map(path => `https://www.kencorp.co.jp${path}`)

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
  return
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

(async () => {

  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await getNewContext(browser);
  let page = await getNewPage(context);

  console.log(`##### Start - KEN`);
  await page.goto(checkUrl);
  await page.waitForTimeout(1000)

  while (1) {
    await scanRoom(page)

    // Pagenation
    const { nextPageExist,  nextPage } = await pagenation(page)
    if (!nextPageExist) {
      break;
    } else {
      page = nextPage;
    }
    await page.waitForTimeout(5000)
  }

  console.log(`##### Done - KEN`);

  await page.close()
  await browser.close();
})();
