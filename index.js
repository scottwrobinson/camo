"use strict";

require('harmony-reflect');

exports.connect = require('./lib/db').connect;
exports.Document = require('./lib/document');
