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
    let collectionPath = getCollectionPath(url, collectionName);
    return new Datastore({filename: collectionPath, autoload: true});
};

const getCollection = function(name, collections, path) {
    if (!(name in collections)) {
        let collection = createCollection(name, path);
        collections[name] = collection;
        return collection;
    }
    
    return collections[name];
};

class NeDbClient extends DatabaseClient {
    constructor(url, collections) {
        super(url);
        this._path = urlToPath(url);

        if (collections) {
            this._collections = collections;
        } else {
            this._collections = {};
        }
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
            const db = getCollection(collection, that._collections, that._path);

            // TODO: I'd like to just use update with upsert:true, but I'm
            // note sure how the query will work if id == null. Seemed to
            // have some problems before with passing null ids.
            if (id === null) {
                db.insert(values, function(error, result) {
                    if (error) return reject(error);
                    return resolve(result._id);
                });
            } else {
                db.update({ _id: id }, { $set: values }, { upsert: true }, function(error, result) {
                    if (error) return reject(error);
                    return resolve(result);
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

            const db = getCollection(collection, that._collections, that._path);
            db.remove({ _id: id }, function (error, numRemoved) {
                if (error) return reject(error);
                return resolve(numRemoved);
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
        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);
            db.remove(query, function (error, numRemoved) {
                if (error) return reject(error);
                return resolve(numRemoved);
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
        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);
            db.remove(query, { multi: true }, function (error, numRemoved) {
                if (error) return reject(error);
                return resolve(numRemoved);
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
        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);
            db.findOne(query, function (error, result) {
                if (error) return reject(error);
                return resolve(result);
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

        if (!options) {
            options = {};
        }

        // Since this is 'findOne...' we'll only allow user to update
        // one document at a time
        options.multi = false;

        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);

            // TODO: Would like to just use 'Collection.update' here, but
            // it doesn't return objects on update (but will on insert)...
            /*db.update(query, values, options, function(error, numReplaced, newDoc) {
                if (error) return reject(error);
                resolve(newDoc);
            });*/

            that.findOne(collection, query).then(function(data) {
                if (!data) {
                    if (options.upsert) {
                        return db.insert(values, function(error, result) {
                            if (error) return reject(error);
                            return resolve(result);
                        });
                    } else {
                        return resolve(null);
                    }
                } else {
                    return db.update(query, { $set: values }, function(error, result) {
                        if (error) return reject(error);
                        
                        // Fixes issue #55. Remove when NeDB is updated to v1.8+
                        db.findOne({_id: data._id}, function(error, doc) {
                            if (error) return reject(error);
                            resolve(doc);
                        });
                    });
                }
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

        if (!options) {
            options = {};
        }

        // Since this is 'findOne...' we'll only allow user to update
        // one document at a time
        options.multi = false;

        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);
            db.remove(query, options, function (error, numRemoved) {
                if (error) return reject(error);
                return resolve(numRemoved);
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
        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);
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
            cursor.exec(function(error, result) {
                if (error) return reject(error);
                return resolve(result);
            });
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
        const that = this;
        return new Promise(function(resolve, reject) {
            const db = getCollection(collection, that._collections, that._path);
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

        const db = getCollection(collection, this._collections, this._path);
        db.ensureIndex({fieldName: field, unique: options.unique, sparse: options.sparse});
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
        let dbLocation = urlToPath(url);

        return new Promise(function(resolve, reject) {
            let collections = {};

            // TODO: Load all data upfront or on-demand?
            // Maybe give user the option to load upfront.
            // But which should we do by default?
            /*fs.readdir(dbLocation, function(error, files) {
                files.forEach(function(file) {
                    let extname = path.extname(file);
                    let filename = file.split('.')[0];
                    if (extname === '.db' && filename.length > 0) {
                        let collectionName = filename;
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
        // Nothing to do for NeDB
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
        const that = this;

        let clearPromises = [];
        _.keys(this._collections).forEach(function(key) {
            let p = new Promise(function(resolve, reject) {
                let dbLocation = getCollectionPath(that._path, key);

                if (dbLocation === 'memory') {
                    // Only exists in memory, so just delete the 'Datastore'
                    delete that._collections[key];
                    resolve();
                } else {
                    // Delete the file, but only if it exists
                    fs.stat(dbLocation, function(err, stat) {
                        if (err === null) {
                            fs.unlink(dbLocation, function(err) {
                                if (err) reject(err);
                                delete that._collections[key];
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                }
            });
            clearPromises.push(p);
        });

        return Promise.all(clearPromises);
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