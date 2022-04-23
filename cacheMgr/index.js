const grpc = require('@grpc/grpc-js');
const Redis = require("ioredis");

const setting = require('./setting');
const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');

const redis_server_url = process.env.REDIS_SERVER_URL ? process.env.REDIS_SERVER_URL : "redis://192.168.2.132:31951";
const redis = new Redis(redis_server_url); // uses defaults unless given configuration object

const CACHE_KEY_VAL_NOTIFIED = "1"
const CACHE_KEY_VAL_INSPECTED = "2"

createKeyFromDetail = (detailObj) => {
  // console.log(detailObj)
  const key = [
    detailObj.getPrice(),
    detailObj.getSize(),
    detailObj.getFloorlevel().getFloorlevel(),
    detailObj.getFloorlevel().getFloortoplevel(),
    detailObj.getLocation()
  ].join('-');
  return key
}
  
CheckCacheByUrl = async (call, callback) => {
  const url = call.request.getUrl();
  const result = new messages.CheckCacheByUrlResponse();

  val = await redis.get(url)
  console.log('CheckCacheByUrl', url, val, typeof(val))
  if (val == 0 || val === '0' || val === '' || val == null) {
    console.log('Not checked yet', url)
    result.setResult(messages.CacheStatus.NOT_CACHED);
  } else if (val === CACHE_KEY_VAL_INSPECTED) {
    if (!setting.IGNORE_INSPECTED_CACHE) {
      console.log('Already cached', 'INSPECTED', url)
      result.setResult(messages.CacheStatus.ALREADY_INSPECTED);
    } else {
      console.log('Not notified yet (ignore INSPECTED status)', url)
      result.setResult(messages.CacheStatus.NOT_CACHED);
    }
  } else {
    console.log('Already cached', 'NOTIFIED', url)
    result.setResult(messages.CacheStatus.ALREADY_NOTIFIED);
  }

  callback(null, result);
}

AddCache = async (call, callback) => {
  const detailObj = call.request.getDetail();
  const cacheMode = call.request.getMode();
  const key = createKeyFromDetail(detailObj)
  const result = new messages.AddCacheResponse();

  if (!setting.ENABLE_CACHE) {
    callback(null, result)
    return
  }

  console.log("AddCache", cacheMode, key, detailObj.getAddress())

  await redis.set(key, cacheMode)
  await redis.set(detailObj.getAddress(), cacheMode)

  callback(null, result );
}

CheckCacheByDetail = async (call, callback) => {
  const key = createKeyFromDetail(call.request.getDetail())
  const result = new messages.CheckCacheByDetailResponse();

  val = await redis.get(key)
  console.log('CheckCacheByDetail', key, val, typeof(val))
  if (val == 0 || val === '0' || val === '' || val == null) {
    console.log('Not checked yet', key)
    result.setResult(messages.CacheStatus.NOT_CACHED);
  } else if (val === CACHE_KEY_VAL_INSPECTED) {
    if (!setting.IGNORE_INSPECTED_CACHE) {
      console.log('Already cached', 'INSPECTED', key)
      result.setResult(messages.CacheStatus.ALREADY_INSPECTED);
    } else {
      console.log('Not notified yet (ignore INSPECTED status)', key)
      result.setResult(messages.CacheStatus.NOT_CACHED);
    }
  } else {
    console.log('Already cached', 'NOTIFIED', key)
    result.setResult(messages.CacheStatus.ALREADY_NOTIFIED);
  }

  callback(null, result);
}

(() => {
  const server = new grpc.Server();
  server.addService(services.CacheMgrService,
    {
      checkCacheByUrl: CheckCacheByUrl,
      checkCacheByDetail: CheckCacheByDetail,
      addCache: AddCache
    });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
  });
})();

