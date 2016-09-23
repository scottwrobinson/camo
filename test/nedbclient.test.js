'use strict';

const _ = require('lodash');
const fs = require('fs');
const expect = require('chai').expect;
const connect = require('../index').connect;
const Document = require('../index').Document;
const validateId = require('./util').validateId;

describe('NeDbClient', function() {

    const url = 'nedb://memory';
    let database = null;

    // TODO: This is acting weird. Randomly passes/fails. Seems to
    // be caused by document.test.js. When that one doesn't run,
    // this one always passes. Maybe some leftover files are still
    // floating around due to document.test.js?
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

    /*describe('#dropDatabase()', function() {
        it('should drop the database and delete all its data', function(done) {

            console.log('here-2');

            let data1 = getData1();
            let data2 = getData2();

            console.log('here-22');

            data1.save().then(function(d) {
                console.log('here-1');
                validateId(d);
                return data2.save();
            }).then(function(d) {
                console.log('here00');
                validateId(d);
            }).then(function() {
                console.log('here0');
                // Validate the client CREATED the necessary file(s)
                expect(_.isEmpty(database.driver())).to.not.be.true;
                return new Promise(function(resolve, reject) {
                    console.log('here1');
                    fs.readdir(database._path, function(error, files) {
                        let dbFiles = [];
                        files.forEach(function(f) {
                            if (_.endsWith(f, '.db')) dbFiles.push(f);
                        });
                        expect(dbFiles).to.have.length(1);
                        resolve();
                    });
                });
            }).then(function() {
                console.log('here2');
                return database.dropDatabase();
            }).then(function() {
                console.log('here3');
                // Validate the client DELETED the necessary file(s)
                expect(_.isEmpty(database.driver())).to.be.true;
                return new Promise(function(resolve, reject) {
                    console.log('here4');
                    fs.readdir(database._path, function(error, files) {
                        let dbFiles = [];
                        files.forEach(function(f) {
                            if (_.endsWith(f, '.db')) dbFiles.push(f);
                        });
                        expect(dbFiles).to.have.length(0);
                        resolve();
                    });
                });
            }).then(done, done);
        });
    });*/

    describe('id', function() {
        it('should allow custom _id values', function(done) {
            class School extends Document {
                constructor() {
                    super();

                    this.name = String;
                }
            }

            let school = School.create();
            school._id = '1234567890abcdef';
            school.name = 'South Park Elementary';

            school.save().then(function() {
                validateId(school);
                expect(school._id).to.be.equal('1234567890abcdef');
                return School.findOne();
            }).then(function(s) {
                validateId(s);
                expect(s._id).to.be.equal('1234567890abcdef');
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
                expect(error.errorType).to.be.equal('uniqueViolated');
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