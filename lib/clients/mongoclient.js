"use strict";

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var MDBClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var DatabaseClient = require('./client');

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
                db.updateOne({ _id: id }, { $set: values }, function(error, result) {
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
            var query = {_id: id};
            query = that.setupId(query);
            db.deleteOne(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    deleteOne(collection, query) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            query = that.setupId(query);
            db.deleteOne(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    deleteMany(collection, query) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            query = that.setupId(query);
            db.deleteMany(query, {w:1}, function (error, result) {
                if (error) return reject(error);
                return resolve(result.deletedCount);
            });
        });
    }

    loadOne(collection, query) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            query = that.setupId(query);
            db.findOne(query, function (error, doc) {
                if (error) return reject(error);
                return resolve(doc);
            });
        }.bind(this));
    }

    loadOneAndUpdate(collection, query, values, options) {
        var that = this;

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
            query = that.setupId(query);
            db.findOneAndUpdate(query, update, options, function(error, result) {
                if (error) return reject(error);
                resolve(result.value);
            });
        });
    }

    loadOneAndDelete(collection, query, options) {
        var that = this;

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

    loadMany(collection, query) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            query = that.setupId(query);
            db.find(query).toArray(function (error, docs) {
                if (error) return reject(error);
                return resolve(docs);
            });
        });
    }

    count(collection, query) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var db = that._mongo.collection(collection);
            query = that.setupId(query);
            db.count(query, function (error, count) {
                if (error) return reject(error);
                return resolve(count);
            });
        });
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
        return value instanceof ObjectId || String(value).match(/^[a-fA-F0-9]{24}$/);
    }

    setupId(query) {
      if(query.id && !(query.id instanceof ObjectId)){
        query.id = ObjectId(query.id);
      }
      if(query._id && !(query._id instanceof ObjectId)){
        query._id = ObjectId(query._id);
      }
      return query;
    }

    nativeIdType() {
        return ObjectId;
    }

    driver() {
        return this._mongo;
    }

}

module.exports = MongoClient;
