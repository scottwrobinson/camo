'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const MDBClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const DatabaseClient = require('./client');
const isObject = require('../validate').isObject;
const deepTraverse = require('../util').deepTraverse;

class MongoClient extends DatabaseClient {
    constructor(url, mongo) {
        super(url);

        this._mongo = mongo;
    }

    /**
     * Save (upsert) document
     *
     * @param {String} collection Collection's name
     * @param {ObjectId?} id Document's id
     * @param {Object} values Data for save
     * @returns {Promise} Promise with result insert or update query
     */
    save(collection, id, values) {
        const that = this;
        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);

            // TODO: I'd like to just use update with upsert:true, but I'm
            // note sure how the query will work if id == null. Seemed to
            // have some problems before with passing null ids.
            if (id === null) {
                db.insertOne(values, function(error, result) {
                    if (error) return reject(error);
                    if (!result.hasOwnProperty('insertedId') || result.insertedId === null) {
                        return reject(new Error('Save failed to generate ID for object.'));
                    }

                    return resolve(result.insertedId);
                });
            } else {
                db.updateOne({ _id: id }, { $set: values }, { upsert: true }, function(error, result) {
                    if (error) return reject(error);
                    return resolve();
                });
            }
        });
    }

    /**
     * Delete document
     *
     * @param {String} collection Collection's name
     * @param {ObjectId} id Document's id
     * @returns {Promise}
     */
    delete(collection, id) {
        const that = this;
        return new Promise(function(resolve, reject) {
            if (id === null) resolve(0);

            const db = that._mongo.collection(collection);
            db.deleteOne({ _id: id }, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    /**
     * Delete one document by query
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @returns {Promise}
     */
    deleteOne(collection, query) {
        const that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);
            db.deleteOne(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    /**
     * Delete many documents by query
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @returns {Promise}
     */
    deleteMany(collection, query) {
        const that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);
            db.deleteMany(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    /**
     * Find one document
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @returns {Promise}
     */
    findOne(collection, query) {
        const that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);
            db.findOne(query, function (error, doc) {
                if (error) return reject(error);
                return resolve(doc);
            });
        });
    }

    /**
     * Find one document and update it
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @param {Object} values
     * @param {Object} options
     * @returns {Promise}
     */
    findOneAndUpdate(collection, query, values, options) {
        const that = this;
        query = castQueryIds(query);
        if (!options) {
            options = {};
        }

        // Always return the updated object
        options.returnOriginal = false;

        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);

            let update = values;
            if (options.upsert) {
                update = { $setOnInsert: update };
            } else {
                update = { $set: update };
            }

            db.findOneAndUpdate(query, update, options, function(error, result) {
                if (error) return reject(error);
                resolve(result.value);
            });
        });
    }

    /**
     * Find one document and delete it
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @param {Object} options
     * @returns {Promise}
     */
    findOneAndDelete(collection, query, options) {
        const that = this;
        query = castQueryIds(query);
        if (!options) {
            options = {};
        }

        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);

            db.findOneAndDelete(query, options, function (error, result) {
                if (error) return reject(error);
                return resolve(result.value === null ? 0 : 1);
            });
        });
    }

    /**
     * Find documents
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @param {Object} options
     * @returns {Promise}
     */
    find(collection, query, options) {
        const that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);
            let cursor = db.find(query);
            if (options.sort && (_.isArray(options.sort) || _.isString(options.sort))) {
                let sortOptions = {};
                if (!_.isArray(options.sort)) {
                    options.sort = [options.sort];
                }

                options.sort.forEach(function(s) {
                    if (!_.isString(s)) return;

                    let sortOrder = 1;
                    if (s[0] === '-') {
                        sortOrder = -1;
                        s = s.substring(1);
                    }
                    sortOptions[s] = sortOrder;
                });

                cursor = cursor.sort(sortOptions);
            }
            if (typeof options.skip === 'number') {
                cursor = cursor.skip(options.skip);
            }
            if (typeof options.limit === 'number') {
                cursor = cursor.limit(options.limit);
            }
            cursor.toArray(function(error, docs) {
                if (error) return reject(error);
                return resolve(docs);
            });
        });
    }

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param {String} collection Collection's name
     * @param {Object} query Query
     * @returns {Promise}
     */
    count(collection, query) {
        const that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            const db = that._mongo.collection(collection);
            db.count(query, function (error, count) {
                if (error) return reject(error);
                return resolve(count);
            });
        });
    }

    /**
     * Create index
     *
     * @param {String} collection Collection's name
     * @param {String} field Field name
     * @param {Object} options Options
     * @returns {Promise}
     */
    createIndex(collection, field, options) {
        options = options || {};
        options.unique = options.unique || false;
        options.sparse = options.sparse || false;
        
        const db = this._mongo.collection(collection);

        let keys = {};
        keys[field] = 1;
        db.createIndex(keys, {unique: options.unique, sparse: options.sparse});
    }

    /**
     * Connect to database
     *
     * @param {String} url
     * @param {Object} options
     * @returns {Promise}
     */
    static connect(url, options) {
        if (typeof(options) === 'undefined') {
            options = { };
        }
        return new Promise(function(resolve, reject) {
            MDBClient.connect(url, options, function(error, client) {
                if (error) return reject(error);
                return resolve(new MongoClient(url, client));
            });
        });
    }

    /**
     * Close current connection
     *
     * @returns {Promise}
     */
    close() {
        const that = this;
        return new Promise(function(resolve, reject) {
            that._mongo.close(function(error) {
                if (error) return reject(error);
                return resolve();
            });
        });
    }

    /**
     * Drop collection
     *
     * @param {String} collection
     * @returns {Promise}
     */
    clearCollection(collection) {
        const that = this;
        return new Promise(function(resolve, reject) {
            that._mongo.dropCollection(collection, function(error, result) {
                if (error) return reject(error);
                return resolve();
            });
        });
    }

    /**
     * Drop current database
     *
     * @returns {Promise}
     */
    dropDatabase() {
        const that = this;
        return new Promise(function(resolve, reject) {
            that._mongo.dropDatabase(function(error, result) {
                if (error) return reject(error);
                return resolve();
            });
        });
    }

    /**
     * Convert ObjectId to canonical form
     *
     * @param {ObjectId} id
     * @returns {*|string|String}
     */
    toCanonicalId(id) {
        return id.toString();
    }

    /**
     * Is Native ID
     *
     * @param {*} value
     * @returns {boolean}
     */
    isNativeId(value) {
        return value instanceof ObjectId || String(value).match(/^[a-fA-F0-9]{24}$/) !== null;
    }

    nativeIdType() {
        return ObjectId;
    }

    driver() {
        return this._mongo;
    }

}

const castId = function(val) {
    return new ObjectId(val);
};

const castIdArray = function(vals) {
    return vals.map(function(v) {
        return castId(v);
    });
};

/**
 * Traverses query and converts all IDs to MongoID
 *
 * TODO: Should we check for $not operator?
 *
 * @param {Object} query
 * @returns {Object}
 */
const castQueryIds = function(query) {
    deepTraverse(query, function(key, val, parent) {
        if (key === '_id') {
            if (String(parent[key]).match(/^[a-fA-F0-9]{24}$/)) {
                parent[key] = castId(parent[key]);
            } else if (isObject(parent[key]) && _.has(parent[key], '$in')) {
                // { _id: { '$in': [ 'K1cbMk7T8A0OU83IAT4dFa91', 'Y1cbak7T8A1OU83IBT6aPq11' ] } }
                parent[key].$in = castIdArray(parent[key].$in);
            } else if (isObject(parent[key]) && _.has(parent[key], '$nin')) {
                // { _id: { '$nin': [ 'K1cbMk7T8A0OU83IAT4dFa91', 'Y1cbak7T8A1OU83IBT6aPq11' ] } }
                parent[key].$nin = castIdArray(parent[key].$nin);
            }
        }
    });

    return query;
};

module.exports = MongoClient;