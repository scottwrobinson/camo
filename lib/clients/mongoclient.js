"use strict";

var path = require('path');
var fs = require('fs');
var DatabaseClient = require('./client');
var MDBClient = require('mongodb').MongoClient

class MongoClient extends DatabaseClient {
	constructor(url, mongo) {
		super(url);

		this._mongo = mongo;
	}

	save(collection, query, values) {
		// Mongo
		// Use updateOne
    }

    delete(collection) {
    	// Mongo
        // Use deleteOne
    }

    static deleteOne(collection, query) {
    	// Mongo
        // Use deleteOne
    }

    static deleteMany(collection, query) {
    	// Mongo
        // Use deleteMany
    }

    static loadOne(collection, query) {
        // Use findOne
    }

    static loadMany(collection, query) {
        // Use find
    }

    static connect(url) {
    	return new Promise(function(resolve, reject) {
    		MDBClient.connect(url, function(error, client) {
    			if (error) return reject(error);
    			return resolve(new MongoClient(url, client));
			});
    	});
	}

    close() {
        return this._mongo.close();
    }
}

module.exports = NeDbClient;