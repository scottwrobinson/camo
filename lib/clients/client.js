'use strict';

class DatabaseClient {
    constructor(url) {
        this._url = url;
    }

    save(collection, query, values) {
        throw new TypeError('You must override save.');
    }

    delete(collection) {
        throw new TypeError('You must override delete.');
    }

    deleteOne(collection, query) {
        throw new TypeError('You must override deleteOne.');
    }

    deleteMany(collection, query) {
        throw new TypeError('You must override deleteMany.');
    }

    findOne(collection, query) {
        throw new TypeError('You must override findOne.');
    }

    findOneAndUpdate(collection, query, values, options) {
        throw new TypeError('You must override findOneAndUpdate.');
    }

    findOneAndDelete(collection, query, options) {
        throw new TypeError('You must override findOneAndDelete.');
    }

    find(collection, query, options) {
        throw new TypeError('You must override findMany.');
    }

    count(collection, query) {
        throw new TypeError('You must override count.');
    }

    createIndex(collection, field, options) {
        throw new TypeError('You must override createIndex.');
    }

    static connect(url, options) {
        throw new TypeError('You must override connect (static).');
    }

    close() {
        throw new TypeError('You must override close.');
    }

    clearCollection(collection) {
        throw new TypeError('You must override clearCollection.');
    }

    dropDatabase() {
        throw new TypeError('You must override dropDatabase.');
    }

    toCanonicalId(id) {
        throw new TypeError('You must override toCanonicalId.');
    }

    isNativeId(value) {
        throw new TypeError('You must override isNativeId.');
    }

    toNativeId(id) {
        return this.nativeIdType()(id);
    }

    nativeIdType() {
        throw new TypeError('You must override nativeIdType.');
    }

    driver() {
        throw new TypeError('You must override driver.');
    }
}

module.exports = DatabaseClient;