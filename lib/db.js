var NeDbClient = require('./clients/nedbclient');
var MongoClient = require('./clients/mongoclient');

exports.connect = function(url, options) {
	if (url.indexOf('nedb://') > -1) {
		// url example: nedb://path/to/file/folder
		return NeDbClient.connect(url, options).then(function(db) {
			global.CLIENT = db;
			return db;
		});
	} else if(url.indexOf('mongodb://') > -1) {
		// url example: 'mongodb://localhost:27017/myproject'
		return MongoClient.connect(url, options).then(function(db) {
			global.CLIENT = db;
			return db;
		});
	} else {
		return Promise.reject(new Error('Unrecognized DB connection url.'));
	}
};