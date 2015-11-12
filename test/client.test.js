"use strict";

var _ = require('lodash');
var expect = require('chai').expect;
var connect = require('../index').connect;
var Document = require('../index').Document;
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

    class Address extends Document {
        constructor() {
            super('address');

            this.street = String;
            this.city = String;
            this.zipCode = Number;
        }
    }

    class Pet extends Document {
        constructor() {
            super('pet');

            this.schema({
                type: String,
                name: String,
            });
        }
    }

    class User extends Document {
        constructor() {
            super('user');

            this.schema({
                firstName: String,
                lastName: String,
                pet: Pet,
                address: Address
            });
        }
    }

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

        it('should populate all fields', function(done) {
            var address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            var dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            var user = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            Promise.all([address.save(), dog.save()]).then(function() {
                validateId(address);
                validateId(dog);
                return user.save();
            }).then(function() {
                validateId(user);
                return User.loadOne({_id: user.id}, {populate: true});
            }).then(function(u) {
                expect(u.pet).to.be.an.instanceof(Pet);
                expect(u.address).to.be.an.instanceof(Address);
            }).then(done, done);
        });

        it('should not populate any fields', function(done) {
            var address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            var dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            var user = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            Promise.all([address.save(), dog.save()]).then(function() {
                validateId(address);
                validateId(dog);
                return user.save();
            }).then(function() {
                validateId(user);
                return User.loadOne({_id: user.id}, {populate: false});
            }).then(function(u) {
                expect(u.pet).to.be.a('string');
                expect(u.address).to.be.a('string');
            }).then(done, done);
        });

        it('should populate specified fields', function(done) {
            var address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            var dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            var user = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            Promise.all([address.save(), dog.save()]).then(function() {
                validateId(address);
                validateId(dog);
                return user.save();
            }).then(function() {
                validateId(user);
                return User.loadOne({_id: user.id}, {populate: ['pet']});
            }).then(function(u) {
                expect(u.pet).to.be.an.instanceof(Pet);
                expect(u.address).to.be.a('string');
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

        it('should populate all fields', function(done) {
            var address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            var dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            var user1 = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            var user2 = User.create({
                firstName: 'Sally',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            Promise.all([address.save(), dog.save()]).then(function() {
                validateId(address);
                validateId(dog);
                return Promise.all([user1.save(), user2.save()]);
            }).then(function() {
                validateId(user1);
                validateId(user2);
                return User.loadMany({}, {populate: true});
            }).then(function(users) {
                expect(users[0].pet).to.be.an.instanceof(Pet);
                expect(users[0].address).to.be.an.instanceof(Address);
                expect(users[1].pet).to.be.an.instanceof(Pet);
                expect(users[1].address).to.be.an.instanceof(Address);
            }).then(done, done);
        });

        it('should not populate any fields', function(done) {
            var address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            var dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            var user1 = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            var user2 = User.create({
                firstName: 'Sally',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            Promise.all([address.save(), dog.save()]).then(function() {
                validateId(address);
                validateId(dog);
                return Promise.all([user1.save(), user2.save()]);
            }).then(function() {
                validateId(user1);
                validateId(user2);
                return User.loadMany({}, {populate: false});
            }).then(function(users) {
                expect(users[0].pet).to.be.a('string');
                expect(users[0].address).to.be.a('string');
                expect(users[1].pet).to.be.a('string');
                expect(users[1].address).to.be.a('string');
            }).then(done, done);
        });

        it('should populate specified fields', function(done) {
            var address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            var dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            var user1 = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            var user2 = User.create({
                firstName: 'Sally',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            Promise.all([address.save(), dog.save()]).then(function() {
                validateId(address);
                validateId(dog);
                return Promise.all([user1.save(), user2.save()]);
            }).then(function() {
                validateId(user1);
                validateId(user2);
                return User.loadMany({}, {populate: ['pet']});
            }).then(function(users) {
                expect(users[0].pet).to.be.an.instanceof(Pet);
                expect(users[0].address).to.be.a('string');
                expect(users[1].pet).to.be.an.instanceof(Pet);
                expect(users[1].address).to.be.a('string');
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