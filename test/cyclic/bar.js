'use strict';

const Document = require('../../index').Document;
//const Foo = require('./foo');

class Bar extends Document {
    constructor() {
        super();

        this.foo = require('./foo');
        this.num = Number;
    }
}

module.exports = Bar;