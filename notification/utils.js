const Redis = require("ioredis");

const setting = require('./setting')

const redis = new Redis('192.168.2.132', 31951); // uses defaults unless given configuration object

const CACHE_KEY_VAL_NOTIFIED = "1"
const CACHE_KEY_VAL_INSPECTED = "2"

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

  if (detailObj.builtYear) {
    const age = new Date().getFullYear() - detailObj.builtYear;
    if ( age > setting.MAX_BUILDING_AGE ) {
      console.log('Too old building!', detailObj.builtYear)
      await addCacheInspected(detailObj)
      return false;
    }
  }

  console.log('Meet the condition !!!')
  return true
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

notify = async (detailObj) => {
  const key = createKeyFromDetail(detailObj)
  if (!await checkCacheByKey(key)) {
    await notifyLine(detailObj)
    console.log('Notified (Paased redundant check)', key)
  }
  await addCache(detailObj, utils.CACHE_KEY_VAL_NOTIFIED)
}
disconnectCache = async () => { await redis.disconnect()}

module.exports = {
  meetCondition,
  disconnectCache,
};
