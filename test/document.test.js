'use strict';

const _ = require('lodash');
const fs = require('fs');
const expect = require('chai').expect;
const connect = require('../index').connect;
const Document = require('../index').Document;
const isDocument = require('../lib/validate').isDocument;
const ValidationError = require('../lib/errors').ValidationError;
const Data = require('./data');
const getData1 = require('./util').data1;
const getData2 = require('./util').data2;
const validateId = require('./util').validateId;
const fail = require('./util').fail;
const expectError = require('./util').expectError;

describe('Document', function() {

    // TODO: Should probably use mock database client...
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

    describe('instantiation', function() {
        it('should allow creation of instance', function(done) {

            class User extends Document {
                constructor() {
                    super();
                    this.firstName = String;
                    this.lastName = String;
                }
            }

            let user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);
            }).then(done, done);
        });

        it('should allow schema declaration via method', function(done) {

            class User extends Document {
                constructor() {
                    super();

                    this.schema({
                        firstName: String,
                        lastName: String
                    });
                }
            }

            let user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);
            }).then(done, done);
        });

        it('should allow creation of instance with data', function(done) {

            class User extends Document {
                constructor() {
                    super();
                    this.firstName = String;
                    this.lastName = String;
                    this.nicknames = [String];
                }
            }

            let user = User.create({
                firstName: 'Billy',
                lastName: 'Bob',
                nicknames: ['Bill', 'William', 'Will']
            });

            expect(user.firstName).to.be.equal('Billy');
            expect(user.lastName).to.be.equal('Bob');
            expect(user.nicknames).to.have.length(3);
            expect(user.nicknames).to.include('Bill');
            expect(user.nicknames).to.include('William');
            expect(user.nicknames).to.include('Will');
            
            done();
        });

        it('should allow creation of instance with references', function(done) {

            class Coffee extends Document {
                constructor() {
                    super();
                    this.temp = Number;
                }
            }

            class User extends Document {
                constructor() {
                    super();
                    this.drinks = [Coffee];
                }
            }

            let coffee = Coffee.create();
            coffee.temp = 105;

            coffee.save().then(function() {
                let user = User.create({ drinks: [coffee] });
                expect(user.drinks).to.have.length(1);
            }).then(done, done);
        });
    });

    describe('class', function() {
        it('should allow use of member variables in getters', function(done) {

            class User extends Document {
                constructor() {
                    super();
                    this.firstName = String;
                    this.lastName = String;
                }

                get fullName() {
                    return this.firstName + ' ' + this.lastName;
                }
            }

            let user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);
                expect(user.fullName).to.be.equal('Billy Bob');
            }).then(done, done);
        });

        it('should allow use of member variables in setters', function(done) {

            class User extends Document {
                constructor() {
                    super();
                    this.firstName = String;
                    this.lastName = String;
                }

                get fullName() {
                    return this.firstName + ' ' + this.lastName;
                }

                set fullName(name) {
                    let nameArr = name.split(' ');
                    this.firstName = nameArr[0];
                    this.lastName = nameArr[1];
                }
            }

            let user = User.create();
            user.fullName = 'Billy Bob';

            user.save().then(function() {
                validateId(user);
                expect(user.firstName).to.be.equal('Billy');
                expect(user.lastName).to.be.equal('Bob');
            }).then(done, done);
        });

        it('should allow use of member variables in methods', function(done) {

            class User extends Document {
                constructor() {
                    super();
                    this.firstName = String;
                    this.lastName = String;
                }

                fullName() {
                    return this.firstName + ' ' + this.lastName;
                }
            }

            let user = User.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';

            user.save().then(function() {
                validateId(user);
                expect(user.fullName()).to.be.equal('Billy Bob');
            }).then(done, done);
        });

        it('should allow schemas to be extended', function(done) {

            class User extends Document {
                constructor(collection) {
                    super(collection);
                    this.firstName = String;
                    this.lastName = String;
                }
            }

            class ProUser extends User {
                constructor() {
                    super();
                    this.paymentMethod = String;
                }
            }

            let user = ProUser.create();
            user.firstName = 'Billy';
            user.lastName = 'Bob';
            user.paymentMethod = 'cash';

            user.save().then(function() {
                validateId(user);
                expect(user.firstName).to.be.equal('Billy');
                expect(user.lastName).to.be.equal('Bob');
                expect(user.paymentMethod).to.be.equal('cash');
            }).then(done, done);
        });

        it('should allow schemas to be overridden', function(done) {

            class Vehicle extends Document {
                constructor(collection) {
                    super(collection);
                    this.numWheels = {
                        type: Number,
                        default: 4
                    };
                }
            }

            class Motorcycle extends Vehicle {
                constructor() {
                    super();
                    this.numWheels = {
                        type: Number,
                        default: 2
                    };
                }
            }

            let bike = Motorcycle.create();

            bike.save().then(function() {
                validateId(bike);
                expect(bike.numWheels).to.be.equal(2);
            }).then(done, done);
        });

        it('should provide default collection name based on class name', function(done) {

            class User extends Document {
                constructor() {
                    super();
                }
            }

            let user = User.create();

            expect(user.collectionName()).to.be.equal('users');
            expect(User.collectionName()).to.be.equal('users');

            done();
        });

        it('should provide default collection name based on subclass name', function(done) {

            class User extends Document {
                constructor() {
                    super();
                }
            }

            class ProUser extends User {
                constructor() {
                    super();
                }
            }

            let pro = ProUser.create();

            expect(pro.collectionName()).to.be.equal('prousers');
            expect(ProUser.collectionName()).to.be.equal('prousers');

            done();
        });

        it('should allow custom collection name', function(done) {

            class User extends Document {
                constructor() {
                    super();
                }

                static collectionName() {
                    return 'sheeple';
                }
            }

            let user = User.create();

            expect(user.collectionName()).to.be.equal('sheeple');
            expect(User.collectionName()).to.be.equal('sheeple');

            done();
        });
    });

    describe('types', function() {
        it('should allow reference types', function(done) {

            class ReferenceeModel extends Document {
                constructor() {
                    super();
                    this.str = String;
                }

                static collectionName() {
                    return 'referencee1';
                }
            }

            class ReferencerModel extends Document {
                constructor() {
                    super();
                    this.ref = ReferenceeModel;
                    this.num = { type: Number };
                }

                static collectionName() {
                    return 'referencer1';
                }
            }

            let data = ReferencerModel.create();
            data.ref = ReferenceeModel.create();
            data.ref.str = 'some data';
            data.num = 1;

            data.ref.save().then(function() {
                validateId(data.ref);
                return data.save();
            }).then(function() {
                validateId(data);
                return ReferencerModel.findOne({ num: 1 });
            }).then(function(d) {
                validateId(d);
                validateId(d.ref);
                expect(d.ref).to.be.an.instanceof(ReferenceeModel);
                expect(d.ref.str).to.be.equal('some data');
            }).then(done, done);
        });

        it('should allow array of references', function(done) {

            class ReferenceeModel extends Document {
                constructor() {
                    super();
                    this.schema({ str: { type: String } });
                }

                static collectionName() {
                    return 'referencee2';
                }
            }

            class ReferencerModel extends Document {
                constructor() {
                    super();
                    this.refs = [ReferenceeModel];
                    this.num = Number;
                }

                static collectionName() {
                    return 'referencer2';
                }
            }

            let data = ReferencerModel.create();
            data.refs.push(ReferenceeModel.create());
            data.refs.push(ReferenceeModel.create());
            data.refs[0].str = 'string1';
            data.refs[1].str = 'string2';
            data.num = 1;

            data.refs[0].save().then(function() {
                validateId(data.refs[0]);
                return data.refs[1].save();
            }).then(function() {
                validateId(data.refs[1]);
                return data.save();
            }).then(function() {
                validateId(data);
                return ReferencerModel.findOne({ num: 1 });
            }).then(function(d) {
                validateId(d);
                validateId(d.refs[0]);
                validateId(d.refs[1]);
                expect(d.refs[0]).to.be.an.instanceof(ReferenceeModel);
                expect(d.refs[1]).to.be.an.instanceof(ReferenceeModel);
                expect(d.refs[0].str).to.be.equal('string1');
                expect(d.refs[1].str).to.be.equal('string2');
            }).then(done, done);
        });

        it('should allow references to be saved using the object or its id', function(done) {
            class ReferenceeModel extends Document {
                constructor() {
                    super();
                    this.str = String;
                }

                static collectionName() {
                    return 'referencee3';
                }
            }

            class ReferencerModel extends Document {
                constructor() {
                    super();
                    this.ref1 = ReferenceeModel;
                    this.ref2 = ReferenceeModel;
                    this.num = { type: Number };
                }

                static collectionName() {
                    return 'referencer3';
                }
            }

            let data = ReferencerModel.create();
            data.ref1 = ReferenceeModel.create();
            let ref2 = ReferenceeModel.create();
            data.ref1.str = 'string1';
            ref2.str = 'string2';
            data.num = 1;

            data.ref1.save().then(function() {
                validateId(data.ref1);
                return data.save();
            }).then(function() {
                validateId(data);
                return ref2.save();
            }).then(function() {
                validateId(ref2);
                data.ref2 = ref2._id;
                return data.save();
            }).then(function() {
                return ReferencerModel.findOne({num: 1});
            }).then(function(d) {
                validateId(d.ref1);
                validateId(d.ref2);
                expect(d.ref1.str).to.be.equal('string1');
                expect(d.ref2.str).to.be.equal('string2');
            }).then(done, done);
        });

        it('should allow array of references to be saved using the object or its id', function(done) {
            class ReferenceeModel extends Document {
                constructor() {
                    super();
                    this.schema({ str: { type: String } });
                }

                static collectionName() {
                    return 'referencee4';
                }
            }

            class ReferencerModel extends Document {
                constructor() {
                    super();
                    this.refs = [ReferenceeModel];
                    this.num = Number;
                }

                static collectionName() {
                    return 'referencer4';
                }
            }

            let data = ReferencerModel.create();
            data.refs.push(ReferenceeModel.create());
            let ref2 = ReferenceeModel.create();
            data.refs[0].str = 'string1';
            ref2.str = 'string2';
            data.num = 1;

            data.refs[0].save().then(function() {
                validateId(data.refs[0]);
                return data.save();
            }).then(function() {
                validateId(data);
                return ref2.save();
            }).then(function() {
                validateId(ref2);
                data.refs.push(ref2._id);
                return data.save();
            }).then(function() {
                return ReferencerModel.findOne({num: 1});
            }).then(function(d) {
                validateId(d.refs[0]);
                validateId(d.refs[1]);
                expect(d.refs[1].str).to.be.equal('string2');
            }).then(done, done);
        });

        it('should allow circular references', function(done) {

            class Employee extends Document {
                constructor() {
                    super();
                    this.name = String;
                    this.boss = Boss;
                }
            }

            class Boss extends Document {
                constructor() {
                    super();
                    this.salary = Number;
                    this.employees = [Employee];
                }

                static collectionName() {
                    return 'bosses';
                }
            }

            let employee = Employee.create();
            employee.name = 'Scott';

            let boss = Boss.create();
            boss.salary = 10000000;

            employee.boss = boss;

            boss.save().then(function() {
                validateId(boss);

                return employee.save();
            }).then(function() {
                validateId(employee);
                validateId(employee.boss);

                boss.employees.push(employee);

                return boss.save();
            }).then(function() {
                validateId(boss);
                validateId(boss.employees[0]);
                validateId(boss.employees[0].boss);

                return Boss.findOne({ salary: 10000000 });
            }).then(function(b) {
                // If we had an issue with an infinite loop
                // of loading circular dependencies then the
                // test probably would have crashed by now,
                // so we're good.

                validateId(b);

                // Validate that boss employee ref was loaded
                validateId(b.employees[0]);

                // .findOne should have only loaded 1 level
                // of references, so the boss's reference
                // to the employee is still the ID.
                expect(b.employees[0].boss).to.not.be.null;
                expect(!isDocument(b.employees[0].boss)).to.be.true;
            }).then(done, done);
        });

        it('should allow string types', function(done) {

            class StringModel extends Document {
                constructor() {
                    super();
                    this.schema({ str: { type: String } });
                }
            }

            let data = StringModel.create();
            data.str = 'hello';

            data.save().then(function() {
                validateId(data);
                expect(data.str).to.be.equal('hello');
            }).then(done, done);
        });

        it('should allow number types', function(done) {

            class NumberModel extends Document {
                constructor() {
                    super();
                    this.schema({ num: { type: Number } });
                }

                static collectionName() {
                    return 'numbers1';
                }
            }

            let data = NumberModel.create();
            data.num = 26;

            data.save().then(function() {
                validateId(data);
                expect(data.num).to.be.equal(26);
            }).then(done, done);
        });

        it('should allow boolean types', function(done) {

            class BooleanModel extends Document {
                constructor() {
                    super();
                    this.schema({ bool: { type: Boolean } });
                }
            }

            let data = BooleanModel.create();
            data.bool = true;

            data.save().then(function() {
                validateId(data);
                expect(data.bool).to.be.equal(true);
            }).then(done, done);
        });

        it('should allow date types', function(done) {

            class DateModel extends Document {
                constructor() {
                    super();
                    this.schema({ date: { type: Date } });
                }
            }

            let data = DateModel.create();
            let date = new Date();
            data.date = date;

            data.save().then(function() {
                validateId(data);
                expect(data.date.valueOf()).to.be.equal(date.valueOf());
            }).then(done, done);
        });

        it('should allow object types', function(done) {

            class ObjectModel extends Document {
                constructor() {
                    super();
                    this.schema({ obj: { type: Object } });
                }
            }

            let data = ObjectModel.create();
            data.obj = { hi: 'bye'};

            data.save().then(function() {
                validateId(data);
                expect(data.obj.hi).to.not.be.null;
                expect(data.obj.hi).to.be.equal('bye');
            }).then(done, done);
        });

        it('should allow buffer types', function(done) {

            class BufferModel extends Document {
                constructor() {
                    super();
                    this.schema({ buf: { type: Buffer } });
                }
            }

            let data = BufferModel.create();
            data.buf = new Buffer('hello');

            data.save().then(function() {
                validateId(data);
                expect(data.buf.toString('ascii')).to.be.equal('hello');
            }).then(done, done);
        });

        it('should allow array types', function(done) {

            class ArrayModel extends Document {
                constructor() {
                    super();
                    this.schema({ arr: { type: Array } });
                }
            }

            let data = ArrayModel.create();
            data.arr = [1, 'number', true];

            data.save().then(function() {
                validateId(data);
                expect(data.arr).to.have.length(3);
                expect(data.arr).to.include(1);
                expect(data.arr).to.include('number');
                expect(data.arr).to.include(true);
            }).then(done, done);
        });

        it('should allow typed-array types', function(done) {

            class ArrayModel extends Document {
                constructor() {
                    super();
                    this.schema({ arr: { type: [String] } });
                }
            }

            let data = ArrayModel.create();
            data.arr = ['1', '2', '3'];

            data.save().then(function() {
                validateId(data);
                expect(data.arr).to.have.length(3);
                expect(data.arr).to.include('1');
                expect(data.arr).to.include('2');
                expect(data.arr).to.include('3');
            }).then(done, done);
        });

        it('should reject objects containing values with different types', function(done) {

            class NumberModel extends Document {
                constructor() {
                    super();
                    this.schema({ num: { type: Number } });
                }

                static collectionName() {
                    return 'numbers2';
                }
            }

            let data = NumberModel.create();
            data.num = '1';

            data.save().then(function() {
                expect.fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expect(error).to.be.instanceof(ValidationError);
            }).then(done, done);
        });

        it('should reject typed-arrays containing different types', function(done) {

            class ArrayModel extends Document {
                constructor() {
                    super();
                    this.schema({ arr: { type: [String] } });
                }
            }

            let data = ArrayModel.create();
            data.arr = [1, 2, 3];

            data.save().then(function() {
                expect.fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expect(error).to.be.instanceof(ValidationError);
            }).then(done, done);
        });
    });

    describe('defaults', function() {
        it('should assign default value if unassigned', function(done) {

            let data = Data.create();

            data.save().then(function() {
                validateId(data);
                expect(data.source).to.be.equal('reddit');
            }).then(done, done);
        });

        it('should assign default value via function if unassigned', function(done) {

            let data = Data.create();

            data.save().then(function() {
                validateId(data);
                expect(data.date).to.be.lessThan(Date.now());
            }).then(done, done);
        });

        it('should be undefined if unassigned and no default is given', function(done) {

            class Person extends Document {
                constructor() {
                    super();
                    this.name = String;
                    this.age = Number;
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: 'Scott'
            });

            person.save().then(function() {
                validateId(person);
                return Person.findOne({name: 'Scott'});
            }).then(function(p) {
                validateId(p);
                expect(p.name).to.be.equal('Scott');
                expect(p.age).to.be.undefined;
            }).then(done, done);
        });
    });

    describe('choices', function() {
        it('should accept value specified in choices', function(done) {

            let data = Data.create();
            data.source = 'wired';

            data.save().then(function() {
                validateId(data);
                expect(data.source).to.be.equal('wired');
            }).then(done, done);
        });

        it('should reject values not specified in choices', function(done) {

            let data = Data.create();
            data.source = 'google';

            data.save().then(function() {
                expect.fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expect(error).to.be.instanceof(ValidationError);
            }).then(done, done);
        });
    });

    describe('min', function() {
        it('should accept value > min', function(done) {

            let data = Data.create();
            data.item = 1;

            data.save().then(function() {
                validateId(data);
                expect(data.item).to.be.equal(1);
            }).then(done, done);
        });

        it('should accept value == min', function(done) {

            let data = Data.create();
            data.item = 0;

            data.save().then(function() {
                validateId(data);
                expect(data.item).to.be.equal(0);
            }).then(done, done);
        });

        it('should reject value < min', function(done) {

            let data = Data.create();
            data.item = -1;

            data.save().then(function() {
                expect.fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expect(error).to.be.instanceof(ValidationError);
            }).then(done, done);
        });
    });

    describe('max', function() {
        it('should accept value < max', function(done) {

            let data = Data.create();
            data.item = 99;

            data.save().then(function() {
                validateId(data);
                expect(data.item).to.be.equal(99);
            }).then(done, done);
        });

        it('should accept value == max', function(done) {

            let data = Data.create();
            data.item = 100;

            data.save().then(function() {
                validateId(data);
                expect(data.item).to.be.equal(100);
            }).then(done, done);
        });

        it('should reject value > max', function(done) {

            let data = Data.create();
            data.item = 101;

            data.save().then(function() {
                expect.fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expect(error).to.be.instanceof(ValidationError);
            }).then(done, done);
        });
    });

    describe('match', function() {
        it('should accept value matching regex', function(done) {

            class Product extends Document {
                constructor() {
                    super();
                    this.name = String;
                    this.cost = {
                        type: String,
                        match: /^\$?[\d,]+(\.\d*)?$/
                    };
                }
            }

            let product = Product.create();
            product.name = 'Dark Roast Coffee';
            product.cost = '$1.39';

            product.save().then(function() {
                validateId(product);
                expect(product.name).to.be.equal('Dark Roast Coffee');
                expect(product.cost).to.be.equal('$1.39');
            }).then(done, done);
        });

        it('should reject value not matching regex', function(done) {

            class Product extends Document {
                constructor() {
                    super();
                    this.name = String;
                    this.cost = {
                        type: String,
                        match: /^\$?[\d,]+(\.\d*)?$/
                    };
                }
            }

            let product = Product.create();
            product.name = 'Light Roast Coffee';
            product.cost = '$1..39';

            product.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });
    });

    describe('validate', function() {
        it('should accept value that passes custom validator', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        validate: function(value) {
                            return value.length > 4;
                        }
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: 'Scott'
            });

            person.save().then(function() {
                validateId(person);
                expect(person.name).to.be.equal('Scott');
            }).then(done, done);
        });

        it('should reject value that fails custom validator', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        validate: function(value) {
                            return value.length > 4;
                        }
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: 'Matt'
            });

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });
    });

    describe('canonicalize', function() {
        it('should ensure timestamp dates are converted to Date objects', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.birthday = Date;
                }

                static collectionName() {
                    return 'people';
                }
            }

            let now = new Date();

            let person = Person.create({
                birthday: now
            });

            person.save().then(function() {
                validateId(person);
                expect(person.birthday.valueOf()).to.be.equal(now.valueOf());
            }).then(done, done);
        });

        it('should ensure date strings are converted to Date objects', function(done) {

            class Person extends Document {
                constructor() {
                    super();
                    this.birthday = Date;
                    this.graduationDate = Date;
                    this.weddingDate = Date;
                }

                static collectionName() {
                    return 'people';
                }
            }

            let birthday = new Date(Date.UTC(2016, 1, 17, 5, 6, 8, 0));
            let graduationDate = new Date(2016, 1, 17, 0, 0, 0, 0);
            let weddingDate = new Date(2016, 1, 17, 0, 0, 0, 0);

            let person = Person.create({
                birthday: '2016-02-17T05:06:08+00:00',
                graduationDate: 'February 17, 2016',
                weddingDate: '2016/02/17'
            });

            person.save().then(function() {
                validateId(person);
                expect(person.birthday.valueOf()).to.be.equal(birthday.valueOf());
                expect(person.graduationDate.valueOf()).to.be.equal(graduationDate.valueOf());
                expect(person.weddingDate.valueOf()).to.be.equal(weddingDate.valueOf());
            }).then(done, done);
        });
    });

    describe('required', function() {
        it('should accept empty value that is not reqired', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        required: false
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: ''
            });

            person.save().then(function() {
                validateId(person);
                expect(person.name).to.be.equal('');
            }).then(done, done);
        });

        it('should accept value that is not undefined', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: 'Scott'
            });

            person.save().then(function() {
                validateId(person);
                expect(person.name).to.be.equal('Scott');
            }).then(done, done);
        });

        it('should accept an empty value if default is specified', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        required: true,
                        default: 'Scott'
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create();

            person.save().then(function() {
                validateId(person);
                expect(person.name).to.be.equal('Scott');
            }).then(done, done);
        });

        it('should accept boolean value', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.isSingle = {
                        type: Boolean,
                        required: true
                    };
                    this.isMerried = {
                        type: Boolean,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                isMerried: true,
                isSingle: false
            });

            person.save().then(function() {
                validateId(person);
                expect(person.isMerried).to.be.true;
                expect(person.isSingle).to.be.false;
            }).then(done, done);
        });

        it('should accept date value', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.birthDate = {
                        type: Date,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let myBirthDate = new Date();

            let person = Person.create({
                birthDate: myBirthDate
            });

            person.save().then(function(savedPerson) {
                validateId(person);
                expect(savedPerson.birthDate.valueOf()).to.equal(myBirthDate.valueOf());
            }).then(done, done);
        });

        it('should accept any number value', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.age = {
                        type: Number,
                        required: true
                    };
                    this.level = {
                        type: Number,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                age: 21,
                level: 0
            });

            person.save().then(function(savedPerson) {
                validateId(person);
                expect(savedPerson.age).to.equal(21);
                expect(savedPerson.level).to.equal(0);
            }).then(done, done);
        });

        it('should reject value that is undefined', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create();

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });

        it('should reject value if specified default empty value', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        required: true,
                        default: ''
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create();

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });

        it('should reject value that is null', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: Object,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: null
            });

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });

        it('should reject value that is an empty array', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.names = {
                        type: Array,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                names: []
            });

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });

        it('should reject value that is an empty string', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.name = {
                        type: String,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: ''
            });

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });

        it('should reject value that is an empty object', function(done) {

            class Person extends Document {
                constructor() {
                    super();

                    this.names = {
                        type: Object,
                        required: true
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                names: {}
            });

            person.save().then(function() {
                fail(null, Error, 'Expected error, but got none.');
            }).catch(function(error) {
                expectError(error);
            }).then(done, done);
        });
    });

    describe('hooks', function() {
        it('should call all pre and post functions', function(done) {

            let preValidateCalled = false;
            let preSaveCalled = false;
            let preDeleteCalled = false;

            let postValidateCalled = false;
            let postSaveCalled = false;
            let postDeleteCalled = false;

            class Person extends Document {
                constructor() {
                    super();
                }

                static collectionName() {
                    return 'people';
                }

                preValidate() {
                    preValidateCalled = true;
                }

                postValidate() {
                    postValidateCalled = true;
                }

                preSave() {
                    preSaveCalled = true;
                }

                postSave() {
                    postSaveCalled = true;
                }

                preDelete() {
                    preDeleteCalled = true;
                }

                postDelete() {
                    postDeleteCalled = true;
                }
            }

            let person = Person.create();

            person.save().then(function() {
                validateId(person);

                // Pre/post save and validate should be called
                expect(preValidateCalled).to.be.equal(true);
                expect(preSaveCalled).to.be.equal(true);
                expect(postValidateCalled).to.be.equal(true);
                expect(postSaveCalled).to.be.equal(true);
                
                // Pre/post delete should not have been called yet
                expect(preDeleteCalled).to.be.equal(false);
                expect(postDeleteCalled).to.be.equal(false);

                return person.delete();
            }).then(function(numDeleted) {
                expect(numDeleted).to.be.equal(1);

                expect(preDeleteCalled).to.be.equal(true);
                expect(postDeleteCalled).to.be.equal(true);
            }).then(done, done);
        });
    });

    describe('serialize', function() {
        it('should serialize data to JSON', function(done) {
            class Person extends Document {
                constructor() {
                    super();

                    this.name = String;
                    this.age = Number;
                    this.isAlive = Boolean;
                    this.children = [String];
                    this.spouse = {
                        type: String,
                        default: null
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: 'Scott',
                age: 28,
                isAlive: true,
                children: ['Billy', 'Timmy'],
                spouse: null
            });

            person.save().then(function() {
                validateId(person);
                expect(person.name).to.be.equal('Scott');
                expect(person.age).to.be.equal(28);
                expect(person.isAlive).to.be.equal(true);
                expect(person.children).to.have.length(2);
                expect(person.spouse).to.be.null;

                let json = person.toJSON();

                expect(json.name).to.be.equal('Scott');
                expect(json.age).to.be.equal(28);
                expect(json.isAlive).to.be.equal(true);
                expect(json.children).to.have.length(2);
                expect(json.spouse).to.be.null;
                expect(json._id).to.be.equal(person._id.toString());
            }).then(done, done);
        });

        it('should serialize data to JSON', function(done) {
            class Person extends Document {
                constructor() {
                    super();

                    this.name = String;
                    this.children = [Person];
                    this.spouse = {
                        type: Person,
                        default: null
                    };
                }

                static collectionName() {
                    return 'people';
                }
            }

            let person = Person.create({
                name: 'Scott'
            });

            let spouse = Person.create({
                name: 'Jane'
            });

            let kid1 = Person.create({
                name: 'Billy'
            });

            let kid2 = Person.create({
                name: 'Timmy'
            });

            spouse.save().then(function() {
                return kid1.save();
            }).then(function() {
                return kid2.save();
            }).then(function() {
                person.spouse = spouse;
                person.children.push(kid1);
                person.children.push(kid2);

                return person.save();
            }).then(function() {
                validateId(person);
                validateId(spouse);
                validateId(kid1);
                validateId(kid2);

                expect(person.name).to.be.equal('Scott');
                expect(person.children).to.have.length(2);
                expect(person.spouse.name).to.be.equal('Jane');
                expect(person.children[0].name).to.be.equal('Billy');
                expect(person.children[1].name).to.be.equal('Timmy');
                expect(person.spouse).to.be.an.instanceof(Person);
                expect(person.children[0]).to.be.an.instanceof(Person);
                expect(person.children[1]).to.be.an.instanceof(Person);

                let json = person.toJSON();

                expect(json.name).to.be.equal('Scott');
                expect(json.children).to.have.length(2);
                expect(json.spouse.name).to.be.equal('Jane');
                expect(json.children[0].name).to.be.equal('Billy');
                expect(json.children[1].name).to.be.equal('Timmy');
                expect(json.spouse).to.not.be.an.instanceof(Person);
                expect(json.children[0]).to.not.be.an.instanceof(Person);
                expect(json.children[1]).to.not.be.an.instanceof(Person);
            }).then(done, done);
        });

        it('should serialize data to JSON and ignore methods', function(done) {
            class Person extends Document {
                constructor() {
                    super();

                    this.name = String;
                }

                static collectionName() {
                    return 'people';
                }

                getFoo() {
                    return 'foo';
                }
            }

            let person = Person.create({
                name: 'Scott'
            });

            let json = person.toJSON();
            expect(json).to.have.keys(['_id', 'name']);
            done();
        });
    });
});