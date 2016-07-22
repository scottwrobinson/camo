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
    const db = this._mongo.collection(collection);

    // TODO: I'd like to just use update with upsert:true, but I'm
    // note sure how the query will work if id == null. Seemed to
    // have some problems before with passing null ids.
    if (id === null) {
      return db
        .insertOne(values)
        .then(result => {
          if (!result.hasOwnProperty('insertedId') || result.insertedId === null) {
            return Promise.reject(new Error('Save failed to generate ID for object.'));
          }

          return result.insertedId;
        });
    }

    return db.updateOne({_id: id}, {$set: values}, {upsert: true});
  }

  /**
   * Delete document
   *
   * @param {String} collection Collection's name
   * @param {ObjectId} id Document's id
   * @returns {Promise}
   */
  delete(collection, id) {
    if (!id) {
      return Promise.resolve(0);
    }

    const db = this._mongo.collection(collection);
    return db
      .deleteOne({_id: id}, {w: 1})
      .then(result => result.deletedCount);
  }

  /**
   * Delete one document by query
   *
   * @param {String} collection Collection's name
   * @param {Object} query Query
   * @returns {Promise}
   */
  deleteOne(collection, query) {
    const db = this._mongo.collection(collection);

    query = castQueryIds(query);

    return db
      .deleteOne(query, {w: 1})
      .then(result => result.deletedCount);
  }

  /**
   * Delete many documents by query
   *
   * @param {String} collection Collection's name
   * @param {Object} query Query
   * @returns {Promise}
   */
  deleteMany(collection, query) {
    const db = this._mongo.collection(collection);

    query = castQueryIds(query);

    return db
      .deleteMany(query, {w: 1})
      .then(result => result.deletedCount);
  }

  /**
   * Find one document
   *
   * @param {String} collection Collection's name
   * @param {Object} query Query
   * @returns {Promise}
   */
  findOne(collection, query) {
    const db = this._mongo.collection(collection);

    query = castQueryIds(query);

    return db.findOne(query);
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
    const db = that._mongo.collection(collection);

    query = castQueryIds(query);
    options = options || {};
    // Always return the updated object
    options.returnOriginal = false;

    let update = values;

    if (options.upsert) {
      update = {$setOnInsert: update};
    } else {
      update = {$set: update};
    }

    return db
      .findOneAndUpdate(query, update, options)
      .then(result => result.value);
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
    const db = this._mongo.collection(collection);
    query = castQueryIds(query);
    options = options || {};

    return db
      .findOneAndDelete(query, options)
      .then(result => result.value === null ? 0 : 1);
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
    query = castQueryIds(query);
    options = options || {};

    const db = this._mongo.collection(collection);
    let cursor = db.find(query);

    if (options.sort && (_.isArray(options.sort) || _.isString(options.sort))) {
      const sortOptions = {};

      if (!_.isArray(options.sort)) {
        options.sort = [options.sort];
      }

      options.sort.forEach(s => {
        if (!_.isString(s)) {
          return;
        }

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

    return cursor.toArray();
  }

  /**
   * Count number of matching documents in the db to a query.
   *
   * @param {String} collection Collection's name
   * @param {Object} query Query
   * @returns {Promise}
   */
  count(collection, query) {
    const db = this._mongo.collection(collection);
    query = castQueryIds(query);

    return db.count(query);
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
    const keys = {};

    keys[field] = 1;

    return db.createIndex(keys, {unique: options.unique, sparse: options.sparse});
  }

  /**
   * Connect to database
   *
   * @param {String} url
   * @param {Object} options
   * @returns {Promise}
   */
  static connect(url, options) {
    options = options || {};

    return MDBClient
      .connect(url, options)
      .then(client => new MongoClient(url, client));
  }

  /**
   * Close current connection
   *
   * @returns {Promise}
   */
  close() {
    return this._mongo.close();
  }

  /**
   * Drop collection
   *
   * @param {String} collection
   * @returns {Promise}
   */
  clearCollection(collection) {
    return this._mongo.dropCollection(collection);
  }

  /**
   * Drop current database
   *
   * @returns {Promise}
   */
  dropDatabase() {
    return this._mongo.dropDatabase();
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

const castId = val => new ObjectId(val);

const castIdArray = vals => vals.map(castId);

/**
 * Traverses query and converts all IDs to MongoID
 *
 * TODO: Should we check for $not operator?
 *
 * @param {Object} query
 * @returns {Object}
 */
const castQueryIds = function(query) {
  if (!_.isObject(query)) {
    return query;
  }

  deepTraverse(query, (key, val, parent) => {
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
