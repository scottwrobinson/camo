'use strict';

const NeDbClient = require('./clients/nedbclient');
const MongoClient = require('./clients/mongoclient');

/**
 * Connect to current database
 *
 * @param {String} url
 * @param {Object} options
 * @returns {Promise}
 */
exports.connect = function(url, options) {
  let client = null;

  if (url.indexOf('nedb://') > -1) {
    client = NeDbClient;
  } else if (url.indexOf('mongodb://') > -1) {
    client = MongoClient;
  } else {
    return Promise.reject(new Error('Unrecognized DB connection url.'));
  }

  return client
    .connect(url, options)
    .then(db => {
      global.CLIENT = db;
      return db;
    });
};
