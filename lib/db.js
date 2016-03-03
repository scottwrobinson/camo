try {
	var NeDbClient = require('./clients/nedbclient');
} catch (e) {
	if(e.code !== 'MODULE_NOT_FOUND') {
		throw e;
	}
	var NeDbClient = null;
}

try {
	var MongoClient = require('./clients/mongoclient');
} catch (e) {
	if(e.code !== 'MODULE_NOT_FOUND') {
		throw e;
	}
	var MongoClient = null;
}

exports.connect = function(url, options) {
	if (url.indexOf('nedb://') > -1) {
		if(NeDbClient === null) {
			return Promise.reject(new Error('The NeDB dependency has not been met'));
		}
		// url example: nedb://path/to/file/folder
		return NeDbClient.connect(url, options).then(function(db) {
			global.CLIENT = db;
			return db;
		});
	} else if(url.indexOf('mongodb://') > -1) {
		if(MongoClient === null) {
			return Promise.reject(new Error('The MongoDB dependency has not been met'));
		}
		// url example: 'mongodb://localhost:27017/myproject'
		return MongoClient.connect(url, options).then(function(db) {
			global.CLIENT = db;
			return db;
		});
	} else {
		return Promise.reject(new Error('Unrecognized DB connection url.'));
	}
};
