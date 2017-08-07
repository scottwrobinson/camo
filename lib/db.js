'use strict';

const NeDbClient = require('./clients/nedbclient');
const MongoClient = require('./clients/mongoclient');
let _adapter;

/**
 * Connect to current database
 *
 * @param {String} url
 * @param {Object} options
 * @returns {Promise}
 */
exports.connect = function (url, options) {
    function handleConnectionSuccessfully(db) {
        global.CLIENT = db;
        return db;
    }

    let connect;
    // We have custom adapter
    if (_adapter) {
        connect = NeDbClient.connect(url, options);
    }
    else
        if (url.indexOf('nedb://') > -1) {
            // url example: nedb://path/to/file/folder
            connect = NeDbClient.connect(url, options);
        } else if (url.indexOf('mongodb://') > -1) {
            // url example: 'mongodb://localhost:27017/myproject'
            connect = MongoClient.connect(url, options);
        } else {
            return Promise.reject(new Error('Unrecognized DB connection url.'));
        }

    return connect.then(handleConnectionSuccessfully);
};

/**
 * Register new adapter instead of using MongoDB and NeDB
 * We assume that the adapter is valid and inherit DatabaseClient
 * @param {DatabaseClient} adapter
 */
exports.registerAdapter = function handleAdapterRegister(adapter) {
    _adapter = adapter;
}