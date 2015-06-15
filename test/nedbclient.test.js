var _ = require('lodash');
var fs = require('fs');
var expect = require('chai').expect;
var connect = require('../index').connect;
var Data = require('./data');
var getData1 = require('./util').data1;
var getData2 = require('./util').data2;
var validateId = require('./util').validateId;

describe('NeDbClient', function() {

    var url = 'nedb://' + __dirname + '/nedbdata';
    var database = null;

    // TODO: This is acting weird. Randomly passes/fails. Seems to
    // be caused by document.test.js. When that one doesn't run,
    // this one always passes. Maybe some leftover files are still
    // floating around due to document.test.js?
    /*before(function(done) {
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

    describe('#dropDatabase()', function() {
        it('should drop the database and delete all its data', function(done) {

            console.log('here-2');

            var data1 = getData1();
            var data2 = getData2();

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
                        var dbFiles = [];
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
                        var dbFiles = [];
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
});