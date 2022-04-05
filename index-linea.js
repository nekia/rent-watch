const playwright = require('playwright-chromium');
// const playwright = require('playwright-core')

const SCANNER_PROTO_PATH = __dirname + '/scanroom/scanroom.proto';
const NOTIFIER_PROTO_PATH = __dirname + '/notification/notification.proto';

const grpc = require('@grpc/grpc-js');
// 定義ファイル(.protoファイル)の読み込み
const protoLoader = require('@grpc/proto-loader');
const packageDefinitionScanner = protoLoader.loadSync(
  SCANNER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const packageDefinitionNotifier = protoLoader.loadSync(
  NOTIFIER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const scanner_proto = grpc.loadPackageDefinition(packageDefinitionScanner).scanroom;
const notifier_proto = grpc.loadPackageDefinition(packageDefinitionNotifier).notification;

const utils = require('./utils')
const setting = require('./setting')

// エリア: 千代田区/新宿区/文京区/目黒区/世田谷区/渋谷区/中野区/杉並区/豊島区/港区
// エリア: 東京都下
// 賃料: 15 - 25
// 専有面積: 50 -
// 駅徒歩分数: 15分以内
// 築年数: 20年以内
// こだわり: 2階以上/南向き/定期借家を含まない
const checkUrl = 'https://www.linea.co.jp/article/list/type/rent?pre2=1&pmi=10&pma=16&smi=6&sma=&req=&bye=4&name=';

scanRoom = async (context, address, client) => {
  const roomPage = await utils.getNewPage(context);

  const notifys = [];
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    let roomLinks = await roomPage.$$('//article[contains(@class, "room-post")]/a')
    for (let i = 0; i < roomLinks.length; i++ ) {
      const link = roomLinks[i];
      const url = await link.getAttribute("href");
      if (await utils.checkCacheByUrl(url)) {
        continue
      }

      const detailObj = await new Promise((resolv, reject) => {
        client.ScanRoomDetail({ url }, function(err, response) {
          resolv(response)
        });
      });
      if (detailObj.location.length == 0) {
        continue;
      }
      if (await utils.meetCondition(detailObj)) {
        notifys.push(detailObj)
      } else {
        await utils.addCache(detailObj, utils.CACHE_KEY_VAL_INSPECTED)
      }
    }
  } catch (error) {
    console.warn('## Failed to retrieve the room info ##', address, error)
  } finally {
    await roomPage.close();
  }
  return notifys
};

scanBuilding = async (context, page, client) => {
  const roomLinks = await page.$$('//div[contains(@class, "pc-residence-row")]//a[contains(@class, "arrow")]')

  let notifyRooms = [];
  const notifys = [];
  for (let i = 0; i < roomLinks.length; i++ ) {
    try {
      const link = roomLinks[i];
      const pathAddress = await link.getAttribute("href");
      const rooms = await scanRoom(context, pathAddress, client)
      notifyRooms.push(...rooms)
    } catch (error) {
      console.warn('## Failed to retrieve the building info ##', address, error)
    }
  }
  return notifyRooms;
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

  const clientScanner = new scanner_proto.Scanner('127.0.0.1:50051',
    grpc.credentials.createInsecure());
  const clientNotifier = new notifier_proto.Notifier('127.0.0.1:50052',
    grpc.credentials.createInsecure());

  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await utils.getNewContext(browser);
  let page = await utils.getNewPage(context);

  let notifyRooms = [];
  console.log(`##### Start - Linea`);
  await page.goto(checkUrl);
  await page.waitForTimeout(1000)

  while (1) {
    const rooms = await scanBuilding(context, page, clientScanner)

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

  const response = await new Promise((resolv, reject) => {
    clientNotifier.Notify( { rooms: notifyRooms }, function(err, response) {
      console.log('Completed Notify', response.status)
      resolv(response)
    });
  })

  console.log(`##### Done - Linea`);

  await page.close()
  await browser.close();
  await utils.disconnectCache()
})();
