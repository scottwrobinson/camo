var NeDbClient = require('./clients/nedbclient');
var MongoClient = require('mongodb').MongoClient;

var database = null;

exports.database = database;

exports.connect = function(url) {
	if (url.indexOf('nedb://') > -1) {
		// url example: nedb://path/to/file/folder
		return NeDbClient.connect(url).then(function(db) {
			database = db;
			return db;
		});
	} else if(url.indexOf('mongodb://') > -1) {
		// url example: 'mongodb://localhost:27017/myproject'
		return new Promise(function(resolve, reject) {
			MongoClient.connect(url, function(error, db) {
				if (error) {
					return reject(error);
				}
				database = db;
				resolve(db);
			});
		});
	} else {
		return Promise.reject(new Error('Unrecognized DB connection url.'));
	}
}