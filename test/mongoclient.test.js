'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const ObjectId = require('mongodb').ObjectId;
const connect = require('../index').connect;
const Document = require('../index').Document;
const validateId = require('./util').validateId;

describe('MongoClient', function() {

    const url = 'mongodb://localhost/camo_test';
    let database = null;

    before(function(done) {
        connect(url).then(function(db) {
            database = db;
            return database.dropDatabase();
        }).then(function(){
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
        done();
    });

    describe('id', function() {
        it('should allow custom _id values', function(done) {
            class School extends Document {
                constructor() {
                    super();

                    this.name = String;
                }
            }

            let school = School.create();
            school._id = new ObjectId('1234567890abcdef12345678');
            school.name = 'Springfield Elementary';

            school.save().then(function() {
                validateId(school);
                expect(school._id.toString()).to.be.equal('1234567890abcdef12345678');
                return School.findOne();
            }).then(function(s) {
                validateId(s);
                expect(s._id.toString()).to.be.equal('1234567890abcdef12345678');
            }).then(done, done);
        });
    });

    describe('query', function() {
        class User extends Document {
            constructor() {
                super();
                this.firstName = String;
                this.lastName = String;
            }
        }

        /*
         * The MongoClient should cast all IDs to ObjectIDs. If the objects
         * requested aren't properly returned, then the IDs were not
         * successfully cast.
         */
        it('should automatically cast string ID in query to ObjectID', function(done) {
            let user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);

                let id = String(user._id);
                return User.findOne({_id: id});
            }).then(function(u) {
                validateId(u);
            }).then(done, done);
        });

        /*
         * Sanity check to make sure we didn't screw up the case
         * where user actually passes an ObjectId
         */
        it('should automatically cast string ID in query to ObjectID', function(done) {
            let user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);

                return User.findOne({_id: user._id});
            }).then(function(u) {
                validateId(u);
            }).then(done, done);
        });

        /*
         * Same as above, but we're testing out more complicated
         * queries. In this case we try it with '$in'.
         */
        it('should automatically cast string IDs in \'$in\' operator to ObjectIDs', function(done) {
            let user1 = User.create();
            user1.firstName = 'Billy';
            user1.lastName = 'Bob';

            let user2 = User.create();
            user2.firstName = 'Jenny';
            user2.lastName = 'Jane';

            let user3 = User.create();
            user3.firstName = 'Danny';
            user3.lastName = 'David';

            Promise.all([user1.save(), user2.save(), user3.save()]).then(function() {
                validateId(user1);
                validateId(user2);

                let id1 = String(user1._id);
                let id3 = String(user3._id);
                return User.find({ _id: { '$in': [ id1, id3 ] } });
            }).then(function(users) {
                expect(users).to.have.length(2);

                let u1 = String(users[0]._id) === String(user1._id) ? users[0] : users[1];
                let u3 = String(users[1]._id) === String(user3._id) ? users[1] : users[0];

                expect(String(u1._id)).to.be.equal(String(user1._id));
                expect(String(u3._id)).to.be.equal(String(user3._id));
            }).then(done, done);
        });

        it('should automatically cast string IDs in deep query objects', function(done) {
            let user1 = User.create();
            user1.firstName = 'Billy';
            user1.lastName = 'Bob';

            let user2 = User.create();
            user2.firstName = 'Jenny';
            user2.lastName = 'Jane';

            let user3 = User.create();
            user3.firstName = 'Danny';
            user3.lastName = 'David';

            Promise.all([user1.save(), user2.save(), user3.save()]).then(function() {
                validateId(user1);
                validateId(user2);

                let id1 = String(user1._id);
                let id3 = String(user3._id);
                return User.find({ $or: [ {_id: id1 }, {_id: id3 } ] });
            }).then(function(users) {
                expect(users).to.have.length(2);

                let u1 = String(users[0]._id) === String(user1._id) ? users[0] : users[1];
                let u3 = String(users[1]._id) === String(user3._id) ? users[1] : users[0];

                expect(String(u1._id)).to.be.equal(String(user1._id));
                expect(String(u3._id)).to.be.equal(String(user3._id));
            }).then(done, done);
        });
    });

    describe('indexes', function() {
        it('should reject documents with duplicate values in unique-indexed fields', function(done) {
            class User extends Document {
                constructor() {
                    super();

                    this.schema({
                        name: String,
                        email: {
                            type: String,
                            unique: true
                        }
                    });
                }
            }

            let user1 = User.create();
            user1.name = 'Bill';
            user1.email = 'billy@example.com';

            let user2 = User.create();
            user1.name = 'Billy';
            user2.email = 'billy@example.com';

            Promise.all([user1.save(), user2.save()]).then(function() {
                expect.fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expect(error instanceof Error).to.be.true;
            }).then(done, done);
        });

        it('should accept documents with duplicate values in non-unique-indexed fields', function(done) {
            class User extends Document {
                constructor() {
                    super();

                    this.schema({
                        name: String,
                        email: {
                            type: String,
                            unique: false
                        }
                    });
                }
            }

            let user1 = User.create();
            user1.name = 'Bill';
            user1.email = 'billy@example.com';

            let user2 = User.create();
            user1.name = 'Billy';
            user2.email = 'billy@example.com';

            Promise.all([user1.save(), user2.save()]).then(function() {
                validateId(user1);
                validateId(user2);
                expect(user1.email).to.be.equal('billy@example.com');
                expect(user2.email).to.be.equal('billy@example.com');
            }).then(done, done);
        });
    });
});