"use strict";

var _ = require('lodash');
var fs = require('fs');
var expect = require('chai').expect;
var connect = require('../index').connect;
var validateId = require('./util').validateId;
var Foo = require('./cyclic/foo');
var Bar = require('./cyclic/bar');

describe('Cyclic', function() {

    // TODO: Should probably use mock database client...
    var url = 'nedb://memory';
    //var url = 'mongodb://localhost/camo_test';
    var database = null;

    before(function(done) {
        connect(url).then(function(db) {
            database = db;
            return database.dropDatabase();
        }).then(function() {
            return done();
        });
    });

    beforeEach(function(done) {
        done();
    });

    afterEach(function(done) {
        database.dropDatabase().then(function() {}).then(done, done);
    });

    after(function(done) {
        database.dropDatabase().then(function() {}).then(done, done);
    });

    describe('schema', function() {
        it('should allow cyclic dependencies', function(done) {
            var f = Foo.create();
            f.num = 26;
            var b = Bar.create();
            b.num = 99;

            f.save().then(function(foo) {
                b.foo = foo;
                return b.save();
            }).then(function(bar) {
                f.bar = b;
                return f.save();
            }).then(function(foo) {
                return Foo.findOne({ num: 26 });
            }).then(function(foo) {
                validateId(foo);
                validateId(foo.bar);
                expect(foo.num).to.be.equal(26);
                expect(foo.bar.num).to.be.equal(99);
                return Bar.findOne({ num: 99 });
            }).then(function(bar) {
                validateId(bar);
                validateId(bar.foo);
                expect(bar.num).to.be.equal(99);
                expect(bar.foo.num).to.be.equal(26);
            }).then(done, done);
            
        });
    });
});