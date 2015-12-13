"use strict";

var BaseDocument = require('./base-document');

class EmbeddedDocument extends BaseDocument {
	constructor() {
		super();
    }

    // TODO: Is there a way to tell if a class is
    // a subclass of something? Until I find out
    // how, we'll be lazy use this.
    static documentClass() {
        return 'embedded';
    }

    documentClass() {
        return 'embedded';
    }
}

module.exports = EmbeddedDocument;