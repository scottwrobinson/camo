'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb');
const DatabaseClient = require('./client');

const urlToPath = function(url) {
  if (url.indexOf('nedb://') > -1) {
    return url.slice(7, url.length);
  }

  return url;
};

const getCollectionPath = function(dbLocation, collection) {
  if (dbLocation === 'memory') {
    return dbLocation;
  }

  return path.join(dbLocation, collection) + '.db';
};

const createCollection = function(collectionName, url) {
  if (url === 'memory') {
    return new Datastore({inMemoryOnly: true});
  }

  const collectionPath = getCollectionPath(url, collectionName);
  return new Datastore({filename: collectionPath, autoload: true});
};

const getCollection = function(name, collections, path) {
  if (!(name in collections)) {
    const collection = createCollection(name, path);
    collections[name] = collection;
    return collection;
  }

  return collections[name];
};

class NeDbClient extends DatabaseClient {

  constructor(url, collections) {
    super(url);
    this._path = urlToPath(url);
    this._collections = collections || {};
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
    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);
      const cb = (error, result) => error ? reject(error) : resolve(result._id);

      // TODO: I'd like to just use update with upsert:true, but I'm
      // note sure how the query will work if id == null. Seemed to
      // have some problems before with passing null ids.
      if (id === null) {
        db.insert(values, cb);
      } else {
        db.update({_id: id}, {$set: values}, {upsert: true}, cb);
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
    return new Promise((resolve, reject) => {
      if (id === null) {
        return resolve(0);
      }

      const db = getCollection(collection, this._collections, this._path);
      return db.remove({_id: id}, (error, numRemoved) => error ? reject(error) : resolve(numRemoved));
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
    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);

      db.remove(query, (error, numRemoved) => error ? reject(error) : resolve(numRemoved));
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
    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);
      db.remove(query, {multi: true}, (error, numRemoved) => error ? reject(error) : resolve(numRemoved));
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
    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);
      db.findOne(query, (error, result) => error ? reject(error) : resolve(result));
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
    options = options || {};

    // Since this is 'findOne...' we'll only allow user to update
    // one document at a time
    options.multi = false;

    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);

      // TODO: Would like to just use 'Collection.update' here, but
      // it doesn't return objects on update (but will on insert)...
      /* db.update(query, values, options, function(error, numReplaced, newDoc) {
       if (error) return reject(error);
       resolve(newDoc);
       }); */

      this.findOne(collection, query)
        .then(data => {
          if (!data) {
            if (options.upsert) {
              return db.insert(values, (error, result) => error ? reject(error) : resolve(result));
            }

            return resolve(null);
          }

          return db.update(query, {$set: values}, error => {
            if (error) {
              return reject(error);
            }

            // Fixes issue #55. Remove when NeDB is updated to v1.8+
            return db.findOne({_id: data._id}, (error, result) => error ? reject(error) : resolve(result));
          });
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
    options = options || {};

    // Since this is 'findOne...' we'll only allow user to update
    // one document at a time
    options.multi = false;

    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);
      db.remove(query, options, (error, numRemoved) => error ? reject(error) : resolve(numRemoved));
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
    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);
      let cursor = db.find(query);

      if (options.sort && (_.isArray(options.sort) || _.isString(options.sort))) {
        const sortOptions = {};
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

      cursor.exec((error, result) => error ? reject(error) : resolve(result));
    });
  }

  /**
   * Get count of collection by query
   *
   * @param {String} collection Collection's name
   * @param {Object} query Query
   * @returns {Promise}
   */
  count(collection, query) {
    return new Promise((resolve, reject) => {
      const db = getCollection(collection, this._collections, this._path);
      db.count(query, (error, result) => error ? reject(error) : resolve(result));
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

    const db = getCollection(collection, this._collections, this._path);

    return new Promise((resolve, reject) => {
      db.ensureIndex(
        {fieldName: field, unique: options.unique, sparse: options.sparse},
        (error, result) => error ? reject(error) : resolve(result)
      );
    });
  }

  /**
   * Connect to database
   *
   * @param {String} url
   * @param {Object} options
   * @returns {Promise}
   */
  static connect(url, options) {
    // Could be directory path or 'memory'
    const dbLocation = urlToPath(url);

    return new Promise((resolve, reject) => {
      const collections = {};

      // TODO: Load all data upfront or on-demand?
      // Maybe give user the option to load upfront.
      // But which should we do by default?
      /*fs.readdir(dbLocation, function(error, files) {
       files.forEach(function(file) {
       const extname = path.extname(file);
       const filename = file.split('.')[0];
       if (extname === '.db' && filename.length > 0) {
       const collectionName = filename;
       collections[collectionName] = createCollection(collectionName, dbLocation);
       }
       });
       global.CLIENT = new NeDbClient(dbLocation, collections);
       resolve(global.CLIENT);
       });*/
      //global.CLIENT = new NeDbClient(dbLocation, collections);
      resolve(new NeDbClient(dbLocation, collections));
    });
  }

  /**
   * Close current connection
   *
   * @returns {Promise}
   */
  close() {
    return Promise.resolve();
  }

  /**
   * Drop collection
   *
   * @param {String} collection
   * @returns {Promise}
   */
  clearCollection(collection) {
    return this.deleteMany(collection, {});
  }

  /**
   * Drop current database
   *
   * @returns {Promise}
   */
  dropDatabase() {
    const clearPromises = [];

    Object.keys(this._collections)
      .forEach(collectionName => clearPromises.push(this._removeCollection(collectionName)));

    return Promise.all(clearPromises);
  }

  /**
   * Remove collection from _collection and from memory or FS
   *
   * @param {String} collectionName
   * @returns {Promise}
   * @private
   */
  _removeCollection(collectionName) {
    return new Promise(resolve => {
      const dbLocation = getCollectionPath(this._path, collectionName);

      if (dbLocation === 'memory') {
        // Only exists in memory, so just delete the 'Datastore'
        delete this._collections[collectionName];
        resolve();
      } else {
        resolve(this._removeFileCollection(collectionName, dbLocation));
      }
    });
  }

  /**
   * Remove collection from FS
   *
   * @param {String} collectionName
   * @param {String} dbLocation
   * @private
   */
  _removeFileCollection(collectionName, dbLocation) {
    const exist = new Promise(resolve => fs.stat(dbLocation, err => err ? resolve(false) : resolve(true)));

    exist
      .then(isExists => {
        if (!isExists) {
          return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
          fs.unlink(dbLocation, unlink_error => {
            if (unlink_error) {
              return reject(unlink_error);
            }

            delete this._collections[collectionName];
            return resolve();
          });
        });
      });
  }

  toCanonicalId(id) {
    return id;
  }

  // Native ids are the same as NeDB ids
  isNativeId(value) {
    return String(value).match(/^[a-zA-Z0-9]{16}$/) !== null;
  }

  nativeIdType() {
    return String;
  }

  driver() {
    return this._collections;
  }

}

module.exports = NeDbClient;
