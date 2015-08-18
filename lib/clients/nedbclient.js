"use strict";

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var Datastore = require('nedb');
var DatabaseClient = require('./client');

var urlToPath = function(url) {
	if (url.indexOf('nedb://') > -1) {
		return url.slice(7, url.length);
	}
	return url;
};

var getCollectionPath = function(dbLocation, collection) {
	if (dbLocation === 'memory') {
		return dbLocation;
	}
	return path.join(dbLocation, collection) + '.db';
};

var createCollection = function(collectionName, url) {
	if (url === 'memory') {
		return new Datastore({inMemoryOnly: true});
	}
	var collectionPath = getCollectionPath(url, collectionName);
	return new Datastore({filename: collectionPath, autoload: true});
};

var getCollection = function(name, collections, path) {
	if (!(name in collections)) {
		var collection = createCollection(name, path);
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

	save(collection, id, values) {
		var that = this;
		return new Promise(function(resolve, reject) {
			var db = getCollection(collection, that._collections, that._path);

			// TODO: I'd like to just use update with upsert:true, but I'm
			// note sure how the query will work if id == null. Seemed to
			// have some problems before with passing null ids.
			if (id === null) {
				db.insert(values, function(error, result) {
					if (error) return reject(error);
					return resolve(result._id);
			    });
			} else {
				db.update({ _id: id }, { $set: values }, function(error, result) {
					if (error) return reject(error);
					return resolve(result);
			    });
			}
		});
    }

    delete(collection, id) {
    	var that = this;
        return new Promise(function(resolve, reject) {
        	if (id === null) resolve(0);

        	var db = getCollection(collection, that._collections, that._path);
    		db.remove({ _id: id }, function (error, numRemoved) {
    			if (error) return reject(error);
    			return resolve(numRemoved);
			});
    	});
    }

    deleteOne(collection, query) {
    	var that = this;
        return new Promise(function(resolve, reject) {
        	var db = getCollection(collection, that._collections, that._path);
    		db.remove(query, function (error, numRemoved) {
    			if (error) return reject(error);
    			return resolve(numRemoved);
			});
    	});
    }

    deleteMany(collection, query) {
    	var that = this;
        return new Promise(function(resolve, reject) {
        	var db = getCollection(collection, that._collections, that._path);
    		db.remove(query, { multi: true }, function (error, numRemoved) {
    			if (error) return reject(error);
    			return resolve(numRemoved);
			});
    	});
    }

    loadOne(collection, query) {
    	var that = this;
    	return new Promise(function(resolve, reject) {
    		var db = getCollection(collection, that._collections, that._path);
    		db.findOne(query, function (error, result) {
    			if (error) return reject(error);
    			return resolve(result);
			});
    	});
    }

    loadOneAndUpdate(collection, query, values, options) {
        var that = this;

        if (!options) {
        	options = {};
        }

        // Since this is 'loadOne...' we'll only allow user to update
        // one document at a time
        options.multi = false;

        return new Promise(function(resolve, reject) {
            var db = getCollection(collection, that._collections, that._path);

            // TODO: Would like to just use 'Collection.update' here, but
            // it doesn't return objects on update (but will on insert)...
            /*db.update(query, values, options, function(error, numReplaced, newDoc) {
            	if (error) return reject(error);
                resolve(newDoc);
            });*/

        	that.loadOne(collection, query).then(function(data) {
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
        				result = _.assign(data, values);
						return resolve(result);
				    });
        		}
        	});
        });
    }

    loadOneAndDelete(collection, query, options) {
        var that = this;

        if (!options) {
        	options = {};
        }

        // Since this is 'loadOne...' we'll only allow user to update
        // one document at a time
        options.multi = false;

        return new Promise(function(resolve, reject) {
        	var db = getCollection(collection, that._collections, that._path);
    		db.remove(query, options, function (error, numRemoved) {
    			if (error) return reject(error);
    			return resolve(numRemoved);
			});
    	});
    }

    loadMany(collection, query) {
    	var that = this;
    	return new Promise(function(resolve, reject) {
    		var db = getCollection(collection, that._collections, that._path);
    		db.find(query, function (error, result) {
    			if (error) return reject(error);
    			return resolve(result);
			});
    	});
    }

    count(collection, query) {
        var that = this;
    	return new Promise(function(resolve, reject) {
    		var db = getCollection(collection, that._collections, that._path);
    		db.count(query, function (error, count) {
    			if (error) return reject(error);
    			return resolve(count);
			});
    	});
    }

    static connect(url, options) {
    	// Could be directory path or 'memory'
		var dbLocation = urlToPath(url);

		return new Promise(function(resolve, reject) {
			var collections = {};

			// TODO: Load all data upfront or on-demand?
			// Maybe give user the option to load upfront.
			// But which should we do by default?
			/*fs.readdir(dbLocation, function(error, files) {
				files.forEach(function(file) {
					var extname = path.extname(file);
					var filename = file.split('.')[0];
					if (extname === '.db' && filename.length > 0) {
						var collectionName = filename;
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

	close() {
		// Nothing to do for NeDB
	}

	clearCollection(collection) {
        return this.deleteMany(collection, {});
    }

    dropDatabase() {
    	var that = this;

    	var clearPromises = [];
    	_.keys(this._collections).forEach(function(key) {
    		var p = new Promise(function(resolve, reject) {
    			var dbLocation = getCollectionPath(that._path, key);

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
        return String(value).match(/^[a-zA-Z0-9]{16}$/);
    }

    nativeIdType() {
        return String;
    }

    driver() {
        return this._collections;
    }

}

module.exports = NeDbClient;