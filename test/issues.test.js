"use strict";

var expect = require('chai').expect;
var connect = require('../index').connect;
var Document = require('../index').Document;
var validateId = require('./util').validateId;

describe('Issues', function() {

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

    describe('#4', function() {
        it('should not load duplicate references in array when only one reference is present', function(done) {
            /* 
             * This issue happens when there are multiple objects in the database,
             * each object has an array of references, and at least two of the
             * object's arrays contain the same reference.

             * In this case, both user1 and user2 have a reference to eye1. So
             * when we call `.loadMany()`, both user1 and user2 will have a
             * duplicate reference to eye1, which is not correct.
             */

            class Eye extends Document {
                constructor() {
                    super('eyes');
                    this.color = String;
                }
            }

            class User extends Document {
                constructor() {
                    super('users');
                    this.eyes = [Eye];
                }
            }

            var user1 = User.create();
            var user2 = User.create();
            var eye1 = Eye.create({color: 'blue'});
            var eye2 = Eye.create({color: 'brown'});

            var id;

            eye1.save().then(function(e) {
                validateId(e);
                return eye2.save();
            }).then(function(e) {
                validateId(e);
                user1.eyes.push(eye1, eye2);
                return user1.save();
            }).then(function(u) {
                validateId(u);
                user2.eyes.push(eye1);
                return user2.save();
            }).then(function(u) {
                validateId(u);
                return User.loadMany({});
            }).then(function(users) {
                expect(users).to.have.length(2);

                // Get user1
                var u1 = String(users[0].id) === String(user1.id) ? users[0] : users[1];

                // Ensure we have correct number of eyes...
                expect(u1.eyes).to.have.length(2);

                var e1 = String(u1.eyes[0].id) === String(eye1.id) ? u1.eyes[0] : u1.eyes[1];
                var e2 = String(u1.eyes[1].id) === String(eye2.id) ? u1.eyes[1] : u1.eyes[0];

                // ...and that we have the correct eyes
                expect(String(e1.id)).to.be.equal(String(eye1.id));
                expect(String(e2.id)).to.be.equal(String(eye2.id));
            }).then(done, done);
        });
    });

    describe('#5', function() {
        it('should allow multiple references to the same object in same array', function(done) {
            /* 
             * This issue happens when an object has an array of
             * references and there are multiple references to the
             * same object in the array.
             *
             * In the code below, we give the user two references
             * to the same Eye, but when we load the user there is
             * only one reference there.
             */

            class Eye extends Document {
                constructor() {
                    super('eyes');
                    this.color = String;
                }
            }

            class User extends Document {
                constructor() {
                    super('users');
                    this.eyes = [Eye];
                }
            }

            var user = User.create();
            var eye = Eye.create({color: 'blue'});

            eye.save().then(function(e) {
                validateId(e);
                user.eyes.push(eye, eye);
                return user.save();
            }).then(function(u) {
                validateId(u);
                return User.loadMany({});
            }).then(function(users) {
                expect(users).to.have.length(1);
                expect(users[0].eyes).to.have.length(2);

                var eyeRefs = users[0].eyes.map(function(e) {return e.id;});

                expect(eyeRefs).to.include(eye.id);
            }).then(done, done);
        });
    });

    describe('#8', function() {
        it('should use virtuals when initializing instance with data', function(done) {
            /* 
             * This issue happens when a model has virtual setters
             * and the caller tries to use those setters during
             * initialization via `create()`. The setters are
             * never called, but they should be.
             */

            class User extends Document {
                constructor() {
                    super('user');
                    this.firstName = String;
                    this.lastName = String;
                }

                set fullName(name) {
                    var split = name.split(' ');
                    this.firstName = split[0];
                    this.lastName = split[1];
                }

                get fullName() {
                    return this.firstName + ' ' + this.lastName;
                }
            }

            var user = User.create({
                fullName: 'Billy Bob'
            });

            expect(user.firstName).to.be.equal('Billy');
            expect(user.lastName).to.be.equal('Bob');
            
            done();
        });
    });
});