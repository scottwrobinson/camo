'use strict';

const BaseDocument = require('./base-document');

class EmbeddedDocument extends BaseDocument {
    constructor() {
        super();

        // TODO: Move _id logic out of BaseDocument.
        // A better fix to this issue is to remove
        // _schema._id and _id from BaseDocument. But
        // since quite a bit of _id logic is still
        // in BD, we'll have to use this fix until
        // it is removed
        delete this._schema._id;
        delete this._id;
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