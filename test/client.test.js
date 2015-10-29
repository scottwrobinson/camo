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

    describe('#save()', function() {
        it('should persist the object and its members to the database', function(done) {

            var data = getData1();

            data.save().then(function() {
                validateId(data);
                validateData1(data);
            }).then(done, done);
        });
    });

    describe('#loadOne()', function() {
        it('should load a single object from the collection', function(done) {

            var data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.loadOne({item:99});
            }).then(function(d) {
                validateId(d);
                validateData1(d);
            }).then(done, done);
        });
    });

    describe('#loadOneAndUpdate()', function() {
        it('should load and update a single object from the collection', function(done) {

            var data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.loadOneAndUpdate({number: 1}, {source: 'wired'});
            }).then(function(d) {
                validateId(d);
                expect(d.number).to.equal(1);
                expect(d.source).to.equal('wired');
            }).then(done, done);
        });

        it('should insert a single object to the collection', function(done) {
            Data.loadOne({number: 1}).then(function(d) {
                expect(d).to.be.null;
                return Data.loadOneAndUpdate({number: 1}, {number: 1}, {upsert: true});
            }).then(function(data) {
                validateId(data);
                expect(data.number).to.equal(1);
                return Data.loadOne({number: 1});
            }).then(function(d) {
                validateId(d);
                expect(d.number).to.equal(1);
            }).then(done, done);
        });
    });

    describe('#loadOneAndDelete()', function() {
        it('should load and delete a single object from the collection', function(done) {

            var data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.count({ number: 1 });
            }).then(function(count) {
                expect(count).to.be.equal(1);
                return Data.loadOneAndDelete({number: 1});
            }).then(function(numDeleted) {
                expect(numDeleted).to.equal(1);
                return Data.count({ number: 1 });
            }).then(function(count) {
                expect(count).to.equal(0);
            }).then(done, done);
        });
    });

    describe('#loadMany()', function() {
        it('should load multiple objects from the collection', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
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

        it('should load all objects when query is not provided', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.loadMany();
            }).then(function(datas) {
                expect(datas).to.have.length(2);
                validateId(datas[0]);
                validateId(datas[1]);
            }).then(done, done);
        });

        it('should sort results in ascending order', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.loadMany({}, {sort: 'number'});
            }).then(function(datas) {
                expect(datas).to.have.length(2);
                validateId(datas[0]);
                validateId(datas[1]);
                expect(datas[0].number).to.be.equal(1);
                expect(datas[1].number).to.be.equal(2);
            }).then(done, done);
        });

        it('should sort results in descending order', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.loadMany({}, {sort: '-number'});
            }).then(function(datas) {
                expect(datas).to.have.length(2);
                validateId(datas[0]);
                validateId(datas[1]);
                expect(datas[0].number).to.be.equal(2);
                expect(datas[1].number).to.be.equal(1);
            }).then(done, done);
        });

        it('should limit number of results returned', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.loadMany({}, {limit: 1});
            }).then(function(datas) {
                expect(datas).to.have.length(1);
                validateId(datas[0]);
            }).then(done, done);
        });

        it('should skip given number of results', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.loadMany({}, {sort: 'number', skip: 1});
            }).then(function(datas) {
                expect(datas).to.have.length(1);
                validateId(datas[0]);
                expect(datas[0].number).to.be.equal(2);
            }).then(done, done);
        });
    });

    describe('#count()', function() {
        it('should return 0 objects from the collection', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.count({ number: 3 });
            }).then(function(count) {
                expect(count).to.be.equal(0);
            }).then(done, done);
        });

        it('should return 2 matching objects from the collection', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.count({});
            }).then(function(count) {
                expect(count).to.be.equal(2);
            }).then(done, done);
        });
    });

    describe('#delete()', function() {
        it('should remove instance from the collection', function(done) {

            var data = getData1();

            data.save().then(function() {
                validateId(data);
                return data.delete();
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

            data.save().then(function() {
                validateId(data);
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

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.deleteMany({});
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(2);
                return Data.loadMany({});
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });

        it('should remove all objects when query is not provided', function(done) {

            var data1 = getData1();
            var data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.deleteMany();
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

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.clearCollection();
            }).then(function() {
                return Data.loadMany();
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });
    });


});