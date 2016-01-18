"use strict";

var Document = require('../../index').Document;
var Bar = require('./bar');

class Foo extends Document {
	constructor() {
		super();

		this.bar = Bar;
		this.num = Number;
	}
}

module.exports = Foo;