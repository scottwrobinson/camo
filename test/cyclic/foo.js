'use strict';

const Document = require('../../index').Document;
const Bar = require('./bar');

class Foo extends Document {
    constructor() {
        super();

        this.bar = Bar;
        this.num = Number;
    }
}

module.exports = Foo;