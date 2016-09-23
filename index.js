'use strict';

exports.connect = require('./lib/db').connect;
exports.getClient = require('./lib/clients').getClient;

exports.Document = require('./lib/document');
exports.EmbeddedDocument = require('./lib/embedded-document');
