var expect = require('chai').expect;
var Data = require('./data');

exports.validateId = function(obj) {
    expect(obj).to.not.be.null;
    expect(obj).to.be.a('object');
    expect(obj.id.toString()).to.be.a('string');
    expect(obj.id.toString()).to.have.length.of.at.least(1);
};

exports.data1 = function() {
    var data = Data.create();
    data.number = 1;
    data.source = 'arstechnica';
    data.item = 99;
    data.values = [33, 101, -1];
    data.date = 1434304033241;
    return data;
};

exports.validateData1 = function(d) {
    expect(d.number).to.be.equal(1);
    expect(d.source).to.be.equal('arstechnica');
    expect(d.item).to.be.equal(99);
    expect(d).to.have.property('values').with.length(3);
    expect(d.date.valueOf()).to.be.equal(1434304033241);
};

exports.data2 = function() {
    var data = Data.create();
    data.number = 2;
    data.source = 'reddit';
    data.item = 26;
    data.values = [1, 2, 3, 4];
    data.date = 1434304039234;
    return data;
};

exports.validateData2 = function(d) {
    expect(d.number).to.be.equal(2);
    expect(d.source).to.be.equal('reddit');
    expect(d.item).to.be.equal(26);
    expect(d).to.have.property('values').with.length(4);
    expect(d.date.valueOf()).to.be.equal(1434304039234);
};