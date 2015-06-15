"use strict";

var _ = require('lodash');
var expect = require('chai').expect;
var connect = require('../index').connect;
var Data = require('./data');
var getData1 = require('./util').data1;
var getData2 = require('./util').data2;
var validateData1 = require('./util').validateData1;
var validateData2 = require('./util').validateData2;
var validateId = require('./util').validateId;

describe('Client', function() {

    var url = 'nedb://' + __dirname + '/nedbdata';
    var database = null;

    before(function(done) {
        connect(url).then(function(db) {
            database = db;
            return database.clearCollection('data');
        }).then(function() {
            return done();
        });
    });

    beforeEach(function(done) {
        done();
    });

    afterEach(function(done) {
        database.clearCollection('data').then(function() {
            database.driver().data.persistence.compactDatafile();
        }).then(done, done);
    });

    after(function(done) {
        database.dropDatabase().then(function() {
            _.keys(database.driver()).forEach(function(key) {
                database.driver()[key].persistence.compactDatafile();
            });
        }).then(done, done);
    }); 

    describe('#save()', function() {
        it('should persist the object and its members to the database', function(done) {

            var data = getData1();

            data.save().then(function(d) {
                validateId(d);
                validateData1(d);
            }).then(done, done);
        });
    });

    describe('#loadOne()', function() {
        it('should load a single object from the collection', function(done) {

            var data = getData1();

            data.save().then(function(d) {
                validateId(d);
                return Data.loadOne({item:99});
            }).then(function(d) {
                validateId(d);
                validateData1(d);
            }).then(done, done);
        });
    });

    describe('#loadMany()', function() {
        it('should load multiple objects from the collection', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function(datas) {
                validateId(datas[0]);
                validateId(datas[1]);
                return Data.loadMany({});
            }).then(function(datas) {
                expect(datas).to.have.length(2);
                validateId(datas[0]);
                validateId(datas[1]);

                if (datas[0].number === 1) {
                    validateData1(datas[0]);
                    validateData2(datas[1]);
                } else {
                    validateData1(datas[1]);
                    validateData2(datas[0]);
                }
            }).then(done, done);
        });
    });

    describe('#delete()', function() {
        it('should remove instance from the collection', function(done) {

            var data = getData1();

            data.save().then(function(d) {
                validateId(d);
                return d.delete();
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(1);
                return Data.loadOne({item:99});
            }).then(function(d) {
                expect(d).to.be.null;
            }).then(done, done);
        });
    });

    describe('#deleteOne()', function() {
        it('should remove the object from the collection', function(done) {

            var data = getData1();

            data.save().then(function(d) {
                validateId(d);
                return Data.deleteOne({number: 1});
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(1);
                return Data.loadOne({number: 1});
            }).then(function(d) {
                expect(d).to.be.null;
            }).then(done, done);
        });
    });

    describe('#deleteMany()', function() {
        it('should remove multiple objects from the collection', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function(datas) {
                validateId(datas[0]);
                validateId(datas[1]);
                return Data.deleteMany({});
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(2);
                return Data.loadMany({});
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });
    });

    describe('#clearCollection()', function() {
        it('should remove all objects from the collection', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function(datas) {
                validateId(datas[0]);
                validateId(datas[1]);
                return Data.clearCollection();
            }).then(function() {
                return Data.loadMany();
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });
    });


});