'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const connect = require('../index').connect;
const Document = require('../index').Document;
const Data = require('./data');
const getData1 = require('./util').data1;
const getData2 = require('./util').data2;
const validateData1 = require('./util').validateData1;
const validateData2 = require('./util').validateData2;
const validateId = require('./util').validateId;
const isNativeId = require('../lib/validate').isNativeId;

describe('Client', function() {

    const url = 'nedb://memory';
    //const url = 'mongodb://localhost/camo_test';
    let database = null;

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

            let data = getData1();

            data.save().then(function() {
                validateId(data);
                validateData1(data);
            }).then(done, done);
        });
    });

    class Address extends Document {
        constructor() {
            super();

            this.street = String;
            this.city = String;
            this.zipCode = Number;
        }

        static collectionName() {
            return 'addresses';
        }
    }

    class Pet extends Document {
        constructor() {
            super();

            this.schema({
                type: String,
                name: String,
            });
        }
    }

    class User extends Document {
        constructor() {
            super();

            this.schema({
                firstName: String,
                lastName: String,
                pet: Pet,
                address: Address
            });
        }
    }

    describe('#findOne()', function() {
        it('should load a single object from the collection', function(done) {

            let data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.findOne({item:99});
            }).then(function(d) {
                validateId(d);
                validateData1(d);
            }).then(done, done);
        });

        it('should populate all fields', function(done) {
            let address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            let dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            let user = User.create({
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
                return User.findOne({_id: user._id}, {populate: true});
            }).then(function(u) {
                expect(u.pet).to.be.an.instanceof(Pet);
                expect(u.address).to.be.an.instanceof(Address);
            }).then(done, done);
        });

        it('should not populate any fields', function(done) {
            let address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            let dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            let user = User.create({
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
                return User.findOne({_id: user._id}, {populate: false});
            }).then(function(u) {
                expect(isNativeId(u.pet)).to.be.true;
                expect(isNativeId(u.address)).to.be.true;
            }).then(done, done);
        });

        it('should populate specified fields', function(done) {
            let address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            let dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            let user = User.create({
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
                return User.findOne({_id: user._id}, {populate: ['pet']});
            }).then(function(u) {
                expect(u.pet).to.be.an.instanceof(Pet);
                expect(isNativeId(u.address)).to.be.true;
            }).then(done, done);
        });
    });

    describe('#findOneAndUpdate()', function() {
        it('should load and update a single object from the collection', function(done) {

            let data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.findOneAndUpdate({number: 1}, {source: 'wired'});
            }).then(function(d) {
                validateId(d);
                expect(d.number).to.equal(1);
                expect(d.source).to.equal('wired');
            }).then(done, done);
        });

        it('should insert a single object to the collection', function(done) {
            Data.findOne({number: 1}).then(function(d) {
                expect(d).to.be.null;
                return Data.findOneAndUpdate({number: 1}, {number: 1}, {upsert: true});
            }).then(function(data) {
                validateId(data);
                expect(data.number).to.equal(1);
                return Data.findOne({number: 1});
            }).then(function(d) {
                validateId(d);
                expect(d.number).to.equal(1);
            }).then(done, done);
        });
    });

    describe('#findOneAndDelete()', function() {
        it('should load and delete a single object from the collection', function(done) {

            let data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.count({ number: 1 });
            }).then(function(count) {
                expect(count).to.be.equal(1);
                return Data.findOneAndDelete({number: 1});
            }).then(function(numDeleted) {
                expect(numDeleted).to.equal(1);
                return Data.count({ number: 1 });
            }).then(function(count) {
                expect(count).to.equal(0);
            }).then(done, done);
        });
    });

    describe('#find()', function() {
        class City extends Document {
            constructor() {
                super();

                this.name = String;
                this.population = Number;
            }

            static collectionName() {
                return 'cities';
            }
        }

        var Springfield, SouthPark, Quahog;

        beforeEach(function(done) {
            Springfield = City.create({
                name: 'Springfield',
                population: 30720
            });

            SouthPark = City.create({
                name: 'South Park',
                population: 4388
            });

            Quahog = City.create({
                name: 'Quahog',
                population: 800
            });

            Promise.all([Springfield.save(), SouthPark.save(), Quahog.save()])
            .then(function() {
                validateId(Springfield);
                validateId(SouthPark);
                validateId(Quahog);
                done();
            }); 
        });

        it('should load multiple objects from the collection', function(done) {
            City.find({}).then(function(cities) {
                expect(cities).to.have.length(3);
                validateId(cities[0]);
                validateId(cities[1]);
                validateId(cities[2]);
            }).then(done, done);
        });

        it('should load all objects when query is not provided', function(done) {
            City.find().then(function(cities) {
                expect(cities).to.have.length(3);
                validateId(cities[0]);
                validateId(cities[1]);
                validateId(cities[2]);
            }).then(done, done);
        });

        it('should sort results in ascending order', function(done) {
            City.find({}, {sort: 'population'}).then(function(cities) {
                expect(cities).to.have.length(3);
                validateId(cities[0]);
                validateId(cities[1]);
                validateId(cities[2]);
                expect(cities[0].population).to.be.equal(800);
                expect(cities[1].population).to.be.equal(4388);
                expect(cities[2].population).to.be.equal(30720);
            }).then(done, done);
        });

        it('should sort results in descending order', function(done) {
            City.find({}, {sort: '-population'}).then(function(cities) {
                expect(cities).to.have.length(3);
                validateId(cities[0]);
                validateId(cities[1]);
                validateId(cities[2]);
                expect(cities[0].population).to.be.equal(30720);
                expect(cities[1].population).to.be.equal(4388);
                expect(cities[2].population).to.be.equal(800);
            }).then(done, done);
        });

        it('should sort results using multiple keys', function(done) {
            let AlphaVille = City.create({
                name: 'Alphaville',
                population: 4388
            });

            let BetaTown = City.create({
                name: 'Beta Town',
                population: 4388
            });

            Promise.all([AlphaVille.save(), BetaTown.save()]).then(function() {
                return City.find({}, {sort: ['population', '-name']});
            }).then(function(cities) {
                expect(cities).to.have.length(5);
                validateId(cities[0]);
                validateId(cities[1]);
                validateId(cities[2]);
                validateId(cities[3]);
                validateId(cities[4]);
                expect(cities[0].population).to.be.equal(800);
                expect(cities[0].name).to.be.equal('Quahog');
                expect(cities[1].population).to.be.equal(4388);
                expect(cities[1].name).to.be.equal('South Park');
                expect(cities[2].population).to.be.equal(4388);
                expect(cities[2].name).to.be.equal('Beta Town');
                expect(cities[3].population).to.be.equal(4388);
                expect(cities[3].name).to.be.equal('Alphaville');
                expect(cities[4].population).to.be.equal(30720);
                expect(cities[4].name).to.be.equal('Springfield');
            }).then(done, done);
        });

        it('should limit number of results returned', function(done) {
            City.find({}, {limit: 2}).then(function(cities) {
                expect(cities).to.have.length(2);
                validateId(cities[0]);
                validateId(cities[1]);
            }).then(done, done);
        });

        it('should skip given number of results', function(done) {
            City.find({}, {sort: 'population', skip: 1}).then(function(cities) {
                expect(cities).to.have.length(2);
                validateId(cities[0]);
                validateId(cities[1]);
                expect(cities[0].population).to.be.equal(4388);
                expect(cities[1].population).to.be.equal(30720);
            }).then(done, done);
        });

        it('should populate all fields', function(done) {
            let address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            let dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            let user1 = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            let user2 = User.create({
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
                return User.find({}, {populate: true});
            }).then(function(users) {
                expect(users[0].pet).to.be.an.instanceof(Pet);
                expect(users[0].address).to.be.an.instanceof(Address);
                expect(users[1].pet).to.be.an.instanceof(Pet);
                expect(users[1].address).to.be.an.instanceof(Address);
            }).then(done, done);
        });

        it('should not populate any fields', function(done) {
            let address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            let dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            let user1 = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            let user2 = User.create({
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
                return User.find({}, {populate: false});
            }).then(function(users) {
                expect(isNativeId(users[0].pet)).to.be.true;
                expect(isNativeId(users[0].address)).to.be.true;
                expect(isNativeId(users[1].pet)).to.be.true;
                expect(isNativeId(users[1].address)).to.be.true;
            }).then(done, done);
        });

        it('should populate specified fields', function(done) {
            let address = Address.create({
                street: '123 Fake St.',
                city: 'Cityville',
                zipCode: 12345
            });

            let dog = Pet.create({
                type: 'dog',
                name: 'Fido',
            });

            let user1 = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                pet: dog,
                address: address
            });

            let user2 = User.create({
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
                return User.find({}, {populate: ['pet']});
            }).then(function(users) {
                expect(users[0].pet).to.be.an.instanceof(Pet);
                expect(isNativeId(users[0].address)).to.be.true;
                expect(users[1].pet).to.be.an.instanceof(Pet);
                expect(isNativeId(users[1].address)).to.be.true;
            }).then(done, done);
        });
    });

    describe('#count()', function() {
        it('should return 0 objects from the collection', function(done) {

            let data1 = getData1();
            let data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.count({ number: 3 });
            }).then(function(count) {
                expect(count).to.be.equal(0);
            }).then(done, done);
        });

        it('should return 2 matching objects from the collection', function(done) {

            let data1 = getData1();
            let data2 = getData2();

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

            let data = getData1();

            data.save().then(function() {
                validateId(data);
                return data.delete();
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(1);
                return Data.findOne({item:99});
            }).then(function(d) {
                expect(d).to.be.null;
            }).then(done, done);
        });
    });

    describe('#deleteOne()', function() {
        it('should remove the object from the collection', function(done) {

            let data = getData1();

            data.save().then(function() {
                validateId(data);
                return Data.deleteOne({number: 1});
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(1);
                return Data.findOne({number: 1});
            }).then(function(d) {
                expect(d).to.be.null;
            }).then(done, done);
        });
    });

    describe('#deleteMany()', function() {
        it('should remove multiple objects from the collection', function(done) {

            let data1 = getData1();
            let data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.deleteMany({});
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(2);
                return Data.find({});
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });

        it('should remove all objects when query is not provided', function(done) {

            let data1 = getData1();
            let data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.deleteMany();
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(2);
                return Data.find({});
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });
    });

    describe('#clearCollection()', function() {
        it('should remove all objects from the collection', function(done) {

            let data1 = getData1();
            let data2 = getData2();

            Promise.all([data1.save(), data2.save()]).then(function() {
                validateId(data1);
                validateId(data2);
                return Data.clearCollection();
            }).then(function() {
                return Data.find();
            }).then(function(datas) {
                expect(datas).to.have.length(0);
            }).then(done, done);
        });
    });


});