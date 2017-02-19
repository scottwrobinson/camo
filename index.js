'use strict';

exports.connect = require('./lib/db').connect;
exports.Clients = require('./lib/clients').Clients;
exports.getClient = require('./lib/clients').getClient;

exports.Document = require('./lib/document');
exports.EmbeddedDocument = require('./lib/embedded-document');
