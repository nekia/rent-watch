const grpc = require('@grpc/grpc-js');
const playwright = require('playwright-chromium');
const nats = require('nats');

const setting = require('./setting/setting.json');
const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');

const SITE_NAME = "HOMES";
const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const cache_mgr_url = process.env.CACHE_MGR_URL ? process.env.CACHE_MGR_URL : "127.0.0.1:50051";

const clientCacheMgr = new services.CacheMgrClient(cache_mgr_url, grpc.credentials.createInsecure());

// エリア: 千代田区/港区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/板橋区/練馬区
// エリア: 武蔵野市/三鷹市/小金井市/国分寺市
// 賃料: 15 - 30
// 専有面積: 60 -
// 駅徒歩分数: 未指定
// 築年数: 未指定
// こだわり: 2階以上/南向き
// 情報の公開日: 本日
const checkUrl = setting.url;

openNConn = () => {
  // to create a connection to a nats-server:
  return nats.connect({ servers: nats_server_url });
}

publishRoom = (nc, url) => {
  const jc = nats.JSONCodec();
  nc.publish("crawl-response", jc.encode({ url }));
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
  try {
    const moreRoomsBtns = await page.$$('.building-addRoomButtonText');
    for (let btn of moreRoomsBtns) {
      await btn.click()
    }

    const roomLinks = await page.$$('//li[@class="building-room"]/a').then((links) => {
      const promises = [];
      for (link of links) {
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
    console.warn('## Failed to retrieve the room info ##', error)
  } finally {
    await closeNConn(nc);
  }
  return
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

startCrawl = async () => {

  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await getNewContext(browser);
  let page = await getNewPage(context);

  console.log(`##### Start - Homes`);
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

  console.log(`##### Done - Homes`);

  await page.close()
  await browser.close();
};

(async () => {
  console.log('nats_server_url', nats_server_url)

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();
  // create a simple subscriber and iterate over messages
  // matching the subscription

  const subCrawlReq = nc.subscribe("crawl-request");
  (async () => {
    for await (const m of subCrawlReq) {
      console.log(m)
      const urlObj = jc.decode(m.data);
      console.log(urlObj)
      const siteName = urlObj.siteName;

      if( siteName !== SITE_NAME) {
        console.log(`It's not a request for me: [${siteName}]`)
        continue;
      }

      console.log(`[${subCrawlReq.getProcessed()}]: ${siteName}`);

      startCrawl()
    }
    console.log("subscription closed");
  })();
})()