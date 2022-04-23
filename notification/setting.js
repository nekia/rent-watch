const MAX_ROOM_PRICE = 23;
const MIN_ROOM_SIZE = 57;
const MIN_FLOOR_LEVEL = 2;
const MAX_BUILDING_AGE = 35;
const MAX_NOTIFIES_AT_ONCE = 200;

const ENABLE_NOTIFY = process.env.ENABLE_NOTIFY === "1" ? true : 
  (process.env.ENABLE_NOTIFY === "0" ? false : true /* default */ );

module.exports = {
	MAX_ROOM_PRICE,
  MIN_ROOM_SIZE,
  MIN_FLOOR_LEVEL,
  MAX_BUILDING_AGE,
  MAX_NOTIFIES_AT_ONCE,
  ENABLE_NOTIFY
};
