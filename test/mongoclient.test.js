"use strict";

var _ = require('lodash');
var expect = require('chai').expect;
var connect = require('../index').connect;
var Document = require('../index').Document;
var validateId = require('./util').validateId;

describe('MongoClient', function() {

    var url = 'mongodb://localhost/camo_test';
    var database = null;

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

    describe('query', function() {
        class User extends Document {
            constructor() {
                super('user');
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
            var user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);

                var id = String(user.id);
                return User.loadOne({_id: id});
            }).then(function(u) {
                validateId(u);
            }).then(done, done);
        });

        /*
         * Sanity check to make sure we didn't screw up the case
         * where user actually passes an ObjectId
         */
        it('should automatically cast string ID in query to ObjectID', function(done) {
            var user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);

                return User.loadOne({_id: user.id});
            }).then(function(u) {
                validateId(u);
            }).then(done, done);
        });

        /*
         * Same as above, but we're testing out more complicated
         * queries. In this case we try it with '$in'.
         */
        it('should automatically cast string IDs in \'$in\' operator to ObjectIDs', function(done) {
            var user1 = User.create();
            user1.firstName = 'Billy';
            user1.lastName = 'Bob';

            var user2 = User.create();
            user2.firstName = 'Jenny';
            user2.lastName = 'Jane';

            var user3 = User.create();
            user3.firstName = 'Danny';
            user3.lastName = 'David';

            Promise.all([user1.save(), user2.save(), user3.save()]).then(function() {
                validateId(user1);
                validateId(user2);

                var id1 = String(user1.id);
                var id3 = String(user3.id);
                return User.loadMany({ _id: { '$in': [ id1, id3 ] } });
            }).then(function(users) {
                expect(users).to.have.length(2);

                var u1 = String(users[0].id) === String(user1.id) ? users[0] : users[1];
                var u3 = String(users[1].id) === String(user3.id) ? users[1] : users[0];

                expect(String(u1.id)).to.be.equal(String(user1.id));
                expect(String(u3.id)).to.be.equal(String(user3.id));
            }).then(done, done);
        });

        it('should automatically cast string IDs in deep query objects', function(done) {
            var user1 = User.create();
            user1.firstName = 'Billy';
            user1.lastName = 'Bob';

            var user2 = User.create();
            user2.firstName = 'Jenny';
            user2.lastName = 'Jane';

            var user3 = User.create();
            user3.firstName = 'Danny';
            user3.lastName = 'David';

            Promise.all([user1.save(), user2.save(), user3.save()]).then(function() {
                validateId(user1);
                validateId(user2);

                var id1 = String(user1.id);
                var id3 = String(user3.id);
                return User.loadMany({ $or: [ {_id: id1 }, {_id: id3 } ] });
            }).then(function(users) {
                expect(users).to.have.length(2);

                var u1 = String(users[0].id) === String(user1.id) ? users[0] : users[1];
                var u3 = String(users[1].id) === String(user3.id) ? users[1] : users[0];

                expect(String(u1.id)).to.be.equal(String(user1.id));
                expect(String(u3.id)).to.be.equal(String(user3.id));
            }).then(done, done);
        });
    });
});