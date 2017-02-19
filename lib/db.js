'use strict';

const { Clients } = require('./clients');

/**
 * Connect to current database
 *
 * @param {String} url
 * @param {Object} options
 * @returns {Promise}
 */
exports.connect = function(url, options) {
    let index = url.indexOf('://');
    if (index <= 0)
        return Promise.reject(new Error('Unrecognized DB connection url.'));

    let type = url.slice(0, index);
    let client = Clients.get(type);
    if (client === null || client === undefined)
        return Promise.reject(new Error(`No Client registered for '${type}'`));

    return client.connect(url, options).then(function(db) {
        global.CLIENT = db;
        return db;
    });
};