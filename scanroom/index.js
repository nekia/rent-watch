const playwright = require('playwright-chromium');
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');

const utils = require('../utils')

const SCANNER_PROTO_PATH = __dirname + '/scanroom.proto'

const packageDefinition = protoLoader.loadSync(
  SCANNER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
const hello_proto = grpc.loadPackageDefinition(packageDefinition).scanroom;

ScanRoomDetail = async (call, callback) => {
  const browser = await playwright['chromium'].launch({ headless: true });
  const context = await utils.getNewContext(browser);
  const roomPage = await utils.getNewPage(context);
  let price = 0.0, size = 0.0, floorLevel = {}, location = "", builtYear = 0;
  const address = call.request.url;
  console.log(address)
  try {
    await roomPage.goto(address);
    await roomPage.waitForTimeout(1000)
    price = await getPriceFloat(roomPage)
    size = await getSizeFloat(roomPage)
    floorLevel = await getFloorLevel(roomPage)
    location = await getLocation(roomPage)
    builtYear = await getBuiltYear(roomPage)
  } catch (error) {
    console.warn('## Failed to retrieve the detail ##', address, error)
  } finally {
    await roomPage.close();
  }
  await roomPage.close()
  await browser.close();
  callback(null, { address, price, size, floorLevel, location, builtYear });
};

getPriceFloat = async (page) => {
  const priceStr = await page.$('//ul[contains(@class, "room-main-floor-list")]/li[text()[contains(., "賃料")]]')
    .then(elm => elm.innerText())
    .then(str => str.match(/([\d,]+)円/))
  return parseInt(priceStr[1].replace(/,/g, '')) / 10000
}

getSizeFloat = async (page) => {
  const roomSizeStr = await page.$('//ul[contains(@class, "room-main-floor-list")]/li[text()[contains(., "面積")]]')
    .then(elm => elm.innerText())
    .then(str => str.match(/([\d.]+)㎡/))
  return parseFloat(roomSizeStr[1])
}

getFloorLevel = async (page) => {
  const floorLevel = await page.$('//div[contains(@class, "room-main-floor-name")]/a')
    .then(elm => elm.innerText())
    .then(str => str.match(/(\d+)\d\d/))

  const floorLevellInt = floorLevel != null ? parseInt(floorLevel[1]) : 2;

  let floorTopLevelInt = 0;
  try {
    const floorTopLevel = await page.$('//ul[contains(@class, "apartment-header-listSpec")]/li[text()[contains(., "階")]]')
      .then(elm => elm.innerText())
      .then(str => str.match(/(\d+)階建*/))
    floorTopLevelInt = parseInt(floorTopLevel[1])
  } catch (error) {
    floorTopLevelInt = floorLevellInt + 1;
  }

  return { floorLevel: floorLevellInt, floorTopLevel: floorTopLevelInt }
}

getLocation = async (page) => {
  const addressStr = await page.$('//div[contains(@class, "spec-group-item")]//dt[text()[contains(., "所在地")]]/following-sibling::dd[1]')
    .then(elm => elm.innerText())
    .then(str => str.trim())
  return addressStr
}

getBuiltYear = async (page) => {
  return page.$('//div[contains(@class, "spec-group-item")]//dt[text()="竣工年"]/following-sibling::dd[1]')
    .then(elm => elm.innerText())
    .then(str => {
      const builtYrStr = str.match(/(\d+)年/)
      return parseInt(builtYrStr[1])
    })
}

function main() {
  const server = new grpc.Server();
  server.addService(hello_proto.Scanner.service, { ScanRoomDetail });
  server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
  });
}

main();
