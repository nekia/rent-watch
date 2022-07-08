const grpc = require('@grpc/grpc-js');
const Redis = require("ioredis");
const axios = require('axios');

const messages = require('./generated/areaInfoMgr_pb');
const services = require('./generated/areaInfoMgr_grpc_pb');

const redis_server_url = process.env.REDIS_SERVER_URL ? process.env.REDIS_SERVER_URL : "redis://192.168.0.132:31899";
const redis = new Redis(redis_server_url); // uses defaults unless given configuration object

const imi_server_url = process.env.IMI_SERVER_URL ? process.env.IMI_SERVER_URL : "http://127.0.0.1:8080";

const LVL = [
  "都道府県",
  "市区町村",
  "町名",
  "丁目",
  "番地",
  "号"
]



getRank = async (call, callback) => {
  const address = call.request.getAddress();
  const rankResult = new messages.GetRankResponse();
  await axios.post(imi_server_url, address, {headers: {'Content-type': 'text/plain'}})
    .then(async (response) => {
      const result = response.data
      let generalized_address = ""

      for(const keyLvl of LVL) {
        if (keyLvl in result["住所"]) {
          generalized_address += result["住所"][keyLvl]
          const key = "rank-" + generalized_address
          if(await redis.exists(key)){
            console.log('Found : ', generalized_address)
            const objStr = await redis.get(key)
            const obj = JSON.parse(objStr)
            rankResult.setRank(obj.rank)
            rankResult.setLatitude(obj.latitude)
            rankResult.setLongitude(obj.longitude)
            break
          }
        } else {
          console.log( `${keyLvl} is not included`)
          break
        }
      }
      if (generalized_address === ""){
        console.log('Not found : ', address)
        console.log(result)
      }
    });

  callback(null, rankResult);
}


(() => {
  const server = new grpc.Server();
  server.addService(services.areaInfoMgrService,
    {
      getRank: getRank
    });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log("Started!")
    server.start();
  });
})();
