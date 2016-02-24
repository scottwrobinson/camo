"use strict";

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var MDBClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var DatabaseClient = require('./client');
var isObject = require('../validate').isObject;
var deepTraverse = require('../util').deepTraverse;

class MongoClient extends DatabaseClient {
    constructor(url, mongo) {
        super(url);

        this._mongo = mongo;
    }

    save(collection, id, values) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);

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

    delete(collection, id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (id === null) resolve(0);

            var db = that._mongo.collection(collection);
            db.deleteOne({ _id: id }, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    deleteOne(collection, query) {
        var that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            db.deleteOne(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    deleteMany(collection, query) {
        var that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            db.deleteMany(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    findOne(collection, query) {
        var that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            db.findOne(query, function (error, doc) {
                if (error) return reject(error);
                return resolve(doc);
            });
        });
    }

    findOneAndUpdate(collection, query, values, options) {
        var that = this;
        query = castQueryIds(query);
        if (!options) {
            options = {};
        }

        // Always return the updated object
        options.returnOriginal = false;

        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);

            var update = values;
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

    findOneAndDelete(collection, query, options) {
        var that = this;
        query = castQueryIds(query);
        if (!options) {
            options = {};
        }

        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);

            db.findOneAndDelete(query, options, function (error, result) {
                if (error) return reject(error);
                return resolve(result.value === null ? 0 : 1);
            });
        });
    }

    find(collection, query, options) {
        var that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            var cursor = db.find(query);
            if (options.sort && (_.isArray(options.sort) || _.isString(options.sort))) {
                var sortOptions = {};
                if (!_.isArray(options.sort)) {
                    options.sort = [options.sort];
                }

                options.sort.forEach(function(s) {
                    if (!_.isString(s)) return;

                    var sortOrder = 1;
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

    count(collection, query) {
        var that = this;
        query = castQueryIds(query);
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            db.count(query, function (error, count) {
                if (error) return reject(error);
                return resolve(count);
            });
        });
    }

    createIndex(collection, field, options) {
        options = options || {};
        options.unique = options.unique || false;
        options.sparse = options.sparse || false;
        
        var db = this._mongo.collection(collection);

        var keys = {};
        keys[field] = 1;
        db.createIndex(keys, {unique: options.unique, sparse: options.sparse});
    }

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

    close() {
        var that = this;
        return new Promise(function(resolve, reject) {
            that._mongo.close(function(error) {
                if (error) return reject(error);
                return resolve();
            });
        });
    }

    clearCollection(collection) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that._mongo.dropCollection(collection, function(error, result) {
                if (error) return reject(error);
                return resolve();
            });
        });
    }

    dropDatabase() {
        var that = this;
        return new Promise(function(resolve, reject) {
            that._mongo.dropDatabase(function(error, result) {
                if (error) return reject(error);
                return resolve();
            });
        });
    }

    toCanonicalId(id) {
        return id.toString();
    }

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

var castId = function(val) {
    return new ObjectId(val);
};

var castIdArray = function(vals) {
    return vals.map(function(v) {
        return castId(v);
    });
};

/*
 * Traverses query and converts all IDs to MongoID
 *
 * TODO: Should we check for $not operator?
 */
var castQueryIds = function(query) {
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