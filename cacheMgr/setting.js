const ENABLE_CACHE = process.env.ENABLE_CACHE === "1" ? true : 
  (process.env.ENABLE_CACHE === "0" ? false : true /* default */ );

const IGNORE_INSPECTED_CACHE = process.env.IGNORE_INSPECTED_CACHE === "1" ? true : 
  (process.env.IGNORE_INSPECTED_CACHE === "0" ? false : false /* default */ );

module.exports = {
  ENABLE_CACHE,
  IGNORE_INSPECTED_CACHE
};
