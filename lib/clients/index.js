var assertConnected = function(db) {
	if (db === null || db === undefined) {
		throw new Error('You must first call \'connect\' before loading/saving documents.');
	}
};

exports.getClient = function() {
	var client = global.CLIENT;
	assertConnected(client);
	return client;
};