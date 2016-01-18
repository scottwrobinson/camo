"use strict";

var expect = require('chai').expect;
var deepTraverse = require('../lib/util').deepTraverse;

describe('Util', function() {

    describe('deepTraverse()', function() {
        it('should iterate over all keys nested in an object', function(done) {
            var object = { 'a': [{ 'b': { 'c': 3 } }] };

            var keysSeen = [];
            var valsSeen = [];
            var parentsSeen = [];

            deepTraverse(object, function(key, value, parent) {
                keysSeen.push(key);
                valsSeen.push(value);
                parentsSeen.push(parent);
            });

            expect(keysSeen).to.have.length(4);
            expect(keysSeen).to.include('a');
            expect(keysSeen).to.include('0');
            expect(keysSeen).to.include('b');
            expect(keysSeen).to.include('c');
            expect(valsSeen).to.have.length(4);
            expect(parentsSeen).to.have.length(4);
            expect(keysSeen[0]).to.be.equal('a');
            expect(parentsSeen[1]).to.be.equal(object.a);

            done();
        });
    });
});