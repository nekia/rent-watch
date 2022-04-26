const grpc = require('@grpc/grpc-js');
const playwright = require('playwright-chromium');
const nats = require('nats');

const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');

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
const checkUrl = 'https://www.homes.co.jp/chintai/imayori/list/?sortBy=%24imayori%3Awantmcf&prefectureId=13&cityIds=13101%2C13103%2C13104%2C13105%2C13109%2C13110%2C13112%2C13113%2C13114%2C13115%2C13116%2C13120%2C13203%2C13204&monthMoneyRoom=15&monthMoneyRoomHigh=30&moneyMaintenanceInclude=1&houseArea=50&newDate=1&mcfs=340501%2C340102&wantMcfs=113601%2C263101%2C293101&needsCodes=15';

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

(async () => {

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
})();
