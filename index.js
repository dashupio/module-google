// require first
const { Module } = require('@dashup/module');

// import base
const GoogleConnect = require('./connects/google');

/**
 * export module
 */
class GoogleModule extends Module {
  /**
   * Register all interfaces here
   */
  register(register) {
    // register discord connect
    register('connect', GoogleConnect);
  }
}

// create new
module.exports = new GoogleModule();
