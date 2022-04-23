const grpc = require('@grpc/grpc-js');
const querystring = require('querystring');
const axios = require('axios');
const nats = require('nats');

const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');

const setting = require('./setting');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const cache_mgr_url = process.env.CACHE_MGR_URL ? process.env.CACHE_MGR_URL : "127.0.0.1:50051";

const clientCacheMgr = new services.CacheMgrClient(cache_mgr_url, grpc.credentials.createInsecure());

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

grpc_addCache = (detailObj, mode) => {
  let request = new messages.AddCacheRequest();
  request = copyDetailObjToRequest(detailObj, request);
  request.setMode(mode);

  return new Promise((resolv, reject) => {
    clientCacheMgr.addCache( request, function(err, response) {
      console.log('Completed addCache', mode)
      resolv()
    });
  });
}

addCacheNotified = (detailObj) => {
  return grpc_addCache(detailObj, messages.CacheMode.NOTIFIED)
}

addCacheInspected = (detailObj) => {
  return grpc_addCache(detailObj, messages.CacheMode.INSPECTED)
}

meetCondition = (detailObj) => {
  console.log('Check if meet the conditions', detailObj.address)
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

  if (detailObj.builtYear) {
    const age = new Date().getFullYear() - detailObj.builtYear;
    if ( age > setting.MAX_BUILDING_AGE ) {
      console.log('Too old building!', detailObj.builtYear)
      return false;
    }
  }

  console.log('Meet the condition !!!')
  return true
}

copyDetailObjToRequest = (detailObj, request) => {
  const floorLevel = new messages.FloorLevel();
  floorLevel.setFloorlevel(detailObj.floorLevel.floorLevel)
  floorLevel.setFloortoplevel(detailObj.floorLevel.floorTopLevel)

  const detail = new messages.RoomDetail();
  detail.setAddress(detailObj.address)
  detail.setPrice(detailObj.price)
  detail.setSize(detailObj.size)
  detail.setFloorlevel(floorLevel)
  detail.setLocation(detailObj.location)
  detail.setBuiltyear(detailObj.builtYear)

  request.setDetail(detail);
  return request
}

CheckCacheByDetail = (detailObj) => {
  let request = new messages.CheckCacheByDetailRequest();
  request = copyDetailObjToRequest(detailObj, request)
  
  return new Promise((resolv, reject) => {
    clientCacheMgr.checkCacheByDetail( request, function(err, response) {
      console.log('Completed checkCacheByDetail', response.getResult())
      resolv(response.getResult() != messages.CacheStatus.NOT_CACHED)
    });
  });
}

notifyLine = async (roomObj) => {
  if (setting.ENABLE_NOTIFY) {
    console.log(`New room !!`, roomObj.address)
    config.data = querystring.stringify({
      message: `${roomObj.price}万円  ${roomObj.size}平米  ${roomObj.floorLevel.floorLevel}/${roomObj.floorLevel.floorTopLevel}\n${roomObj.location}\n${roomObj.address}`,
    })
    console.log(config)
    const response = await axios.request(config);
  } else {
    console.log(`New room !! But disable notification to LINE`, roomObj.address)
  }
}

notify = async (detailObjs) => {
  for (let detailObj of detailObjs) {
    await notifyLine(detailObj)
    console.log('Notified (Paased redundant check)')
  }
}

(async () => {

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });

  const js = nc.jetstream();

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();

  while (1) {
    let msgs = js.fetch("mystream", "myconsumer", { batch: 10, expires: 60000 });
    console.log('fetched')
    const done = (async () => {
      const roomsToBeNotified = [];
      for await (const m of msgs) {
        // do something with the message
        // and if the consumer is not set to auto-ack, ack!
        const detailObj = jc.decode(m.data)
        if (!detailObj) {
          console.log('Null')
          m.ack();
          continue
        }

        if (await CheckCacheByDetail(detailObj)) {
          continue
        }

        console.log(`[${msgs.getProcessed()}]:`, detailObj.address)
        if (await meetCondition(detailObj)) {
          roomsToBeNotified.push(detailObj)
          await addCacheNotified(detailObj)
        } else {
          await addCacheInspected(detailObj)
        }
        m.ack();
      }
      console.log('Completed fetch', roomsToBeNotified)
      await notify(roomsToBeNotified)
    })();

    // The iterator completed
    await done;
    console.log('Completed iteration')
  }

})()