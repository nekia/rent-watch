const querystring = require('querystring');
const axios = require('axios');
const Redis = require("ioredis");
const setting = require('./setting');

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

const CACHE_KEY_VAL_NOTIFIED = "1"
const CACHE_KEY_VAL_INSPECTED = "2"

//const redis = new Redis(); // uses defaults unless given configuration object
const redis = new Redis('192.168.2.132', 31951); // uses defaults unless given configuration object

const config = {
  baseURL: BASE_URL,
  url: PATH,
  method: 'post',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Bearer ${LINE_TOKEN}`
  },
  data: querystring.stringify({
    message: `line通知`,
  })
};

let newPageCount = 0;

notifyLine = async (roomObj) => {
  if (setting.ENABLE_NOTIFY) {
    console.log(`New room !!`, roomObj.address)
    config.data = querystring.stringify({
      message: `${roomObj.price}万円  ${roomObj.size}平米  ${roomObj.floorLevel.floorLevel}/${roomObj.floorLevel.floorTopLevel}\n${roomObj.location}\n${roomObj.address}`,
    })
    const response = await axios.request(config);
  } else {
    console.log(`New room !! But disable notification to LINE`, roomObj.address)
  }
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
  newPageCount++
  return context.newPage()
}

getNewPageCount = () => { return newPageCount }

createKeyFromDetail = (detailObj) => {
  const key = [
    detailObj.price,
    detailObj.size,
    detailObj.floorLevel.floorLevel,
    detailObj.floorLevel.floorTopLevel,
    detailObj.location
  ].join('-');
  return key
}

meetCondition = async (detailObj) => {
  key = createKeyFromDetail(detailObj)
  console.log('Check if meet the conditions', key, detailObj.address)
  if (detailObj.price > setting.MAX_ROOM_PRICE) {
    console.log('Too expensive!', detailObj.price)
    await addCacheInspected(detailObj)
    return false;
  }

  if (detailObj.size < setting.MIN_ROOM_SIZE) {
    console.log('Too small!', detailObj.size)
    await addCacheInspected(detailObj)
    return false;
  }

  if (detailObj.floorLevel.floorLevel == detailObj.floorLevel.floorTopLevel) {
    console.log(`Top floor! ${detailObj.floorLevel.floorLevel}/${detailObj.floorLevel.floorTopLevel}`)
    await addCacheInspected(detailObj)
    return false;
  }

  if (detailObj.floorLevel.floorLevel < setting.MIN_FLOOR_LEVEL ) {
    console.log('Too low floor level!', detailObj.floorLevel.floorLevel)
    await addCacheInspected(detailObj)
    return false;
  }
  console.log('Meet the condition !!!')
  return true
}

checkCacheByUrl = async (url) => {
  if (!setting.IGNORE_INSPECTED_CACHE) {
    val = await redis.get(url)
    if (val === '0' || val === '' || val == null) {
      console.log('Not checked yet', url)
      return false
    } else {
      console.log('Already cached', val === CACHE_KEY_VAL_INSPECTED ? 'INSPECTED' : 'NOTIFIED', url)
      return true
    }
  }

  val = await redis.get(url)
  if (val === '0' || val === "" || val == null || val === CACHE_KEY_VAL_INSPECTED) {
      console.log('Not notified yet', url)
      return false
  } else {
    console.log('Already cached', 'NOTIFIED', url)
    return true
  }
}

checkCacheByKey = async (key) => {
  if (!setting.IGNORE_INSPECTED_CACHE) {
    val = await redis.exists(key)
    if (val === '0' || val === '' || val == null) {
      console.log('Not checked yet', key)
      return false
    } else {
      console.log('Already cached', val === CACHE_KEY_VAL_INSPECTED ? 'INSPECTED' : 'NOTIFIED', key)
      return true
    }
  }

  val = await redis.get(key)
  if (val === '0' || val === "" || val == null || val === CACHE_KEY_VAL_INSPECTED) {
    console.log('Not notified yet', key)
    return false
  } else {
    console.log('Already cached', 'NOTIFIED', key)
    return true
  }
}

addCacheInspected = async (detailObj) => {
  if (!setting.ENABLE_CACHE) {
    return
  }
  key = createKeyFromDetail(detailObj)
  await redis.set(key, CACHE_KEY_VAL_INSPECTED)
  return await redis.set(detailObj.address, CACHE_KEY_VAL_INSPECTED)
}

addCache = async (detailObj, stats) => {
  if (!setting.ENABLE_CACHE) {
    return
  }
  key = createKeyFromDetail(detailObj)
  await redis.set(key, stats)
  return await redis.set(detailObj.address, stats)
}

disconnectCache = async () => { await redis.disconnect()}
module.exports = {
	notifyLine,
  getNewContext,
  getNewPage,
  getNewPageCount,
  createKeyFromDetail,
  meetCondition,
  checkCacheByUrl,
  checkCacheByKey,
  addCache,
  addCacheInspected,
  disconnectCache,
  CACHE_KEY_VAL_NOTIFIED,
  CACHE_KEY_VAL_INSPECTED
};
