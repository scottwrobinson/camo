'use strict';

const Document = require('../index').Document;

class Data extends Document {
    constructor() {
        super();

        this.schema({
            number: {
                type: Number
            },
            source: {
                type: String,
                choices: ['reddit', 'hacker-news', 'wired', 'arstechnica'],
                default: 'reddit'
            },
            item: {
                type: Number,
                min: 0,
                max: 100
            },
            values: {
                type: [Number]
            },
            date: {
                type: Date,
                default: Date.now
            }
        });
    }
}

module.exports = Data;