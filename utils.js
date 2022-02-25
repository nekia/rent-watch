const querystring = require('querystring');
const axios = require('axios');
const setting = require('./setting')

const BASE_URL = 'https://notify-api.line.me';
const PATH = '/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

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

createKeyFromDetail = (detailObj) => {
  const key = [
    detailObj.price,
    detailObj.size,
    detailObj.floorLevel.floorLevel,
    detailObj.floorLevel.floorTopLevel,
    detailObj.location
  ].join('-');
  console.log(key)
  return key
}

meetCondition = (detailObj) => {
  if (detailObj.price > setting.MAX_ROOM_PRICE) {
    console.log('Too expensive!', detailObj.price)
    return false;
  }

  if (detailObj.size < setting.MIN_ROOM_SIZE) {
    console.log('Too small!', detailObj.size)
    return false;
  }

  if (detailObj.floorLevel.floorLevel == detailObj.floorLevel.floorTopLevel) {
    console.log(`Top floor! ${detailObj.floorLevel.floorLevel}/${detailObj.floorLevel.floorTopLevel}`)
    return false;
  }

  if (detailObj.floorLevel.floorLevel < setting.MIN_FLOOR_LEVEL ) {
    console.log('Too low floor level!', detailObj.floorLevel.floorLevel)
    return false;
  }
  console.log('Meet the condition !!!')
  return true
}
module.exports = {
	notifyLine,
  getNewContext,
  createKeyFromDetail,
  meetCondition
};
