const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');

const messages = require('./generated/cacheMgr_pb');
const services = require('./generated/cacheMgr_grpc_pb');
const messages_roomdetail = require('./generated/roomdetail_pb');

(async () => {
  const clientCacheMgr = new services.CacheMgrClient('127.0.0.1:50051', grpc.credentials.createInsecure());
  const response = await new Promise((resolv, reject) => {
    const request = new messages.CheckCacheByUrlRequest();
    // request.setUrl("https://tokyo-designers.com/id/2148088/1005")
    // request.setUrl("https://suumo.jp/chintai/bc_100275762974/")
    request.setUrl("https://tokyo-designers.com/id/2148088/1005/aaaa")
    clientCacheMgr.checkCacheByUrl( request, function(err, response) {
      console.log('Completed CheckCacheByUrl', response.toObject())
      resolv(response.toObject())
    });

    const request2 = new messages.CheckCacheByDetailRequest();

    const floorLevel = new messages_roomdetail.FloorLevel();
    floorLevel.setFloorlevel(5)
    floorLevel.setFloortoplevel(5)

    const detail = new messages_roomdetail.RoomDetail();
    detail.setAddress("https://www.linea.co.jp/article/room/type/rent/id/416/rid/3543?sort=")
    detail.setPrice(21.8)
    detail.setSize(65.81)
    detail.setFloorlevel(floorLevel)
    detail.setLocation("東京都新宿区早稲田鶴巻町")
    detail.setBuiltyear(2013)

    request2.setDetail(detail);
    clientCacheMgr.checkCacheByDetail( request2, function(err, response) {
      console.log('Completed checkCacheByDetail', response.toObject())
      resolv(response.toObject())
    });

  })
})()