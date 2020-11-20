// require first
const { Module } = require('@dashup/module');

// import base
const GmailConnect = require('./connects/gmail');
const SheetsConnect = require('./connects/sheets');
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
    register('connect', GmailConnect);
    register('connect', SheetsConnect);
    register('connect', GoogleConnect);
  }
}

// create new
module.exports = new GoogleModule();
