'use strict';

const { Clients, getClient } = require('./lib/clients');

exports.Clients = Clients;
exports.getClient = getClient;
exports.connect = require('./lib/db').connect;

exports.Document = require('./lib/document');
exports.EmbeddedDocument = require('./lib/embedded-document');
