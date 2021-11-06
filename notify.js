const querystring = require('querystring');
const axios = require('axios');

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
  console.log(`New room !!`, roomObj.address)
  config.data = querystring.stringify({
    message: `新しい物件が掲載されました! \n${roomObj.price}万円\t${roomObj.size}平米\t${roomObj.location}\n${roomObj.address}`,
  })
  const response = await axios.request(config);
}

module.exports = {
	notifyLine
};