const fs = require('fs')
const csv = require('csv')
const axios = require('axios');
const Redis = require("ioredis");

const redis_server_url = process.env.REDIS_SERVER_URL ? process.env.REDIS_SERVER_URL : "redis://192.168.0.132:31899";
const redis = new Redis(redis_server_url); // uses defaults unless given configuration object

const LVL = [
  "都道府県",
  "市区町村",
  "町名",
  "丁目",
  "番地",
  "号"
] 

fs.createReadStream(__dirname + '/all2.csv')
  .pipe(csv.parse( async (err, data) => {
    for (let entry of data) {
      const address = `東京都${entry[0]}${entry[1]}`
      const rank = entry[entry.length-1];
      // console.log(address, rank)
      await axios.post('http://127.0.0.1:8080', address, {headers: {'Content-type': 'text/plain'}})
        .then(async (response) => {
          const result = response.data
          let generalized_address = ""
          // console.log(result);

          for(let division of LVL) {
            if (division in result["住所"]) 
              generalized_address += result["住所"][division]
            else
              break
          }
          if (generalized_address === ""){
            console.log(address)
            console.log(result)
          }
          const key = "rank-" + generalized_address
          let value = { rank };
          if("地理座標" in result){
            value = {
              ...value,
              "latitude": result["地理座標"]["緯度"],
              "longitude": result["地理座標"]["経度"]
            }
          }
          console.log(key)
          await redis.set(key, JSON.stringify(value))
        });
    }
  },{
    from: 2
  }))