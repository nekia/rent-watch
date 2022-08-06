const grpc = require('@grpc/grpc-js');
const querystring = require('querystring');
const axios = require('axios');
const nats = require('nats');

const setting = require('./setting/setting.json');
const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');
const messages_roomdetail = require('./generated/roomdetail_pb');
const messagesAreaInfoMgr = require('./generated/areaInfoMgr_pb');
const servicesAreaInfoMgr = require('./generated/areaInfoMgr_grpc_pb');

const nats_server_url = process.env.NATS_SERVER_URL ? process.env.NATS_SERVER_URL : "127.0.0.1:4222";
const nats_consumer_name = process.env.NATS_CONSUMER_NAME ? process.env.NATS_CONSUMER_NAME : "myconsumer";
const nats_consumer_batch_size = process.env.NATS_CONSUMER_BATCH_SIZE ? parseInt(process.env.NATS_CONSUMER_BATCH_SIZE) : 10;
const nats_consumer_batch_duration = process.env.NATS_CONSUMER_BATCH_DURATION ? parseInt(process.env.NATS_CONSUMER_BATCH_DURATION) : 180000;
const cache_mgr_url = process.env.CACHE_MGR_URL ? process.env.CACHE_MGR_URL : "127.0.0.1:50051";
const area_info_mgr_url = process.env.AREA_INFO_MGR_URL ? process.env.AREA_INFO_MGR_URL : "127.0.0.1:50051";
const ENABLE_NOTIFY = process.env.ENABLE_NOTIFY === "1" ? true :
  (process.env.ENABLE_NOTIFY === "0" ? false : setting.enable_notify /* default */ );

const clientCacheMgr = new services.CacheMgrClient(cache_mgr_url, grpc.credentials.createInsecure());
const clientAreaInfoMgr = new servicesAreaInfoMgr.areaInfoMgrClient(area_info_mgr_url, grpc.credentials.createInsecure());

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
  if (detailObj.price > setting.max_room_price) {
    console.log('Too expensive!', detailObj.price)
    return false;
  }

  if (detailObj.price < setting.min_room_price) {
    console.log('Too cheep!', detailObj.price)
    return false;
  }

  if (detailObj.size < setting.min_room_size) {
    console.log('Too small!', detailObj.size)
    return false;
  }

  if (detailObj.floorLevel.floorLevel == detailObj.floorLevel.floorTopLevel) {
    console.log(`Top floor! ${detailObj.floorLevel.floorLevel}/${detailObj.floorLevel.floorTopLevel}`)
    return false;
  }

  if (detailObj.floorLevel.floorLevel < setting.min_floor_level ) {
    console.log('Too low floor level!', detailObj.floorLevel.floorLevel)
    return false;
  }

  if (detailObj.builtYear) {
    const age = new Date().getFullYear() - detailObj.builtYear;
    if ( age > setting.max_building_age ) {
      console.log('Too old building!', detailObj.builtYear)
      return false;
    }
  }

  console.log('Meet the condition !!!')
  return true
}

copyDetailObjToRequest = (detailObj, request) => {
  const floorLevel = new messages_roomdetail.FloorLevel();
  floorLevel.setFloorlevel(detailObj.floorLevel.floorLevel)
  floorLevel.setFloortoplevel(detailObj.floorLevel.floorTopLevel)

  const detail = new messages_roomdetail.RoomDetail();
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
  if (ENABLE_NOTIFY) {
    console.log(`New room !!`, roomObj.address)
    let message = ""

    message += `${roomObj.price}万円 ${roomObj.size}平米 ${roomObj.floorLevel.floorLevel}/${roomObj.floorLevel.floorTopLevel}\n`
    message += `${roomObj.location}\n${roomObj.address}`
    if (roomObj.rank != 0){
      message = `ランク${roomObj.rank} ` + message
      message += `\nhttps://www.google.com/maps/search/?api=1&query=${roomObj.latitude}%2C${roomObj.longitude}`
    }

    config.data = querystring.stringify({
      message
    })
    console.log(config)
    const response = await axios.request(config);
  } else {
    console.log(`New room !! But disable notification to LINE`, roomObj.address)
  }
}

getRankInfo = async (address) => {
  return await new Promise((resolv, reject) => {
    const request = new messagesAreaInfoMgr.GetRankRequest();
    request.setAddress(address);
    clientAreaInfoMgr.getRank(request, (err, response) => {
      console.log(response.toObject());
      resolv(response.toObject());
    })
  });
}

notify = async (detailObjs) => {
  for (let detailObj of detailObjs) {
    await notifyLine(detailObj)
    console.log('Notified (Paased redundant check)')
  }
}

checkDetailObj = async (detailObj) => {
  console.log(`checkDetailObj : ${detailObj.address}`)

  const rankInfo = await getRankInfo(detailObj.location);
  if (parseInt(rankInfo.rank) > setting.min_rank) {
    console.log(`Too high risk in case on disaster! ${rankInfo.rank} / ${setting.min_rank}`);
    await addCacheInspected(detailObj)
    return false;
  }

  if (!await meetCondition(detailObj)) {
    await addCacheInspected(detailObj)
    return false;
  }

  detailObj['rank'] = rankInfo.rank;
  detailObj['latitude'] = rankInfo.latitude;
  detailObj['longitude'] = rankInfo.longitude;

  if (await CheckCacheByDetail(detailObj)) {
    console.log('Already notified')
    await addCacheNotified(detailObj)
    return false;
  }

  await addCacheNotified(detailObj)
  return true;
}

(async () => {

  // to create a connection to a nats-server:
  const nc = await nats.connect({ servers: nats_server_url });

  const js = nc.jetstream();

  // create a codec
  const sc = nats.StringCodec();
  const jc = nats.JSONCodec();

  while (1) {
    let msgs = js.fetch("mystream", nats_consumer_name, { batch: nats_consumer_batch_size, expires: nats_consumer_batch_duration });
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

        if (Array.isArray(detailObj)) {
          for (obj of detailObj) {
            if (await checkDetailObj(obj)) {
              roomsToBeNotified.push(obj)
            }
          }
        } else {
          if (await checkDetailObj(detailObj)) {
            roomsToBeNotified.push(detailObj)
          }
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