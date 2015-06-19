"use strict";

require('./lib/proxyShim');

exports.connect = require('./lib/db').connect;
exports.Document = require('./lib/document');
