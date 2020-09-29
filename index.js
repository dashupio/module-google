// require first
const { Module } = require('@dashup/module');

// import base
const GoogleConnect = require('./connects/google');

/**
 * export module
 */
class GoogleModule extends Module {

  /**
   * construct discord module
   */
  constructor() {
    // run super
    super();
  }
  
  /**
   * Register all connect interfaces here
   * 
   * ```
   * // register connect class
   * register(Connect);
   * ```
   * 
   * Class `Connect` should extend `require('@dashup/module').Connect`
   * 
   * @param {Function} register 
   */
  connects(register) {
    // register discord connect
    register(GoogleConnect);
  }
}

// create new
module.exports = new GoogleModule();
