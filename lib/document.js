'use strict';

const _ = require('lodash');
const deprecate = require('depd')('camo');
const db = require('./clients').getClient;
const BaseDocument = require('./base-document');
const isArray = require('./validate').isArray;
const isReferenceable = require('./validate').isReferenceable;
const isEmbeddedDocument = require('./validate').isEmbeddedDocument;

class Document extends BaseDocument {
  constructor(name) {
    super();

    if (name !== undefined && name !== null) {
      deprecate('Document.constructor(name) - override Document.collectionName() instead');
      this._meta = {
        collection: name
      };
    }
  }

  // TODO: Is there a way to tell if a class is
  // a subclass of something? Until I find out
  // how, we'll be lazy use this.
  static documentClass() {
    return 'document';
  }

  documentClass() {
    return 'document';
  }

  get meta() {
    return this._meta;
  }

  set meta(meta) {
    this._meta = meta;
  }

  /**
   * Save (upsert) current document
   *
   * TODO: The method is too long and complex, it is necessary to divide...
   * @returns {Promise}
   */
  save() {
    const preValidatePromises = this._getHookPromises('preValidate');

    /* eslint max-nested-callbacks: [2,5] */ // TODO: To reduce the number of nested callbacks
    return Promise
      .all(preValidatePromises)
      .then(() => {
        // Ensure we at least have defaults set

        // TODO: We already do this on .create(), so
        // should it really be done again?
        Object.keys(this._schema).forEach(key => {
          if (!(key in this._schema)) {
            this[key] = this.getDefault(key);
          }
        });

        // Validate the assigned type, choices, and min/max
        this.validate();

        // Ensure all data types are saved in the same encodings
        this.canonicalize();

        // TODO: We should instead track what has changed and
        // only update those values. Maybe make this._changed
        // object to do this.
        // Also, this might be really slow for objects with
        // lots of references. Figure out a better way.
        const toUpdate = this._toData({_id: false});

        // Reference our objects
        Object.keys(this._schema).forEach(key => {
          // Never care about _id
          if (key === '_id') {
            return;
          }

          if (isReferenceable(this[key]) ||            // isReferenceable OR
            (isArray(this[key]) &&              // isArray AND contains value AND value isReferenceable
            this[key].length > 0 &&
            isReferenceable(this[key][0]))) {

            // Handle array of references (ex: { type: [MyObject] })
            if (isArray(this[key])) {
              toUpdate[key] = [];
              this[key].forEach(value => {
                if (db().isNativeId(value)) {
                  toUpdate[key].push(value);
                } else {
                  toUpdate[key].push(value._id);
                }
              });
            } else {
              if (db().isNativeId(this[key])) {
                toUpdate[key] = this[key];
              } else {
                toUpdate[key] = this[key]._id;
              }
            }

          }
        });

        // Replace EmbeddedDocument references with just their data
        /* eslint no-underscore-dangle: 0 */
        Object.keys(this._schema).forEach(key => {
          if (isEmbeddedDocument(this[key]) ||               // isEmbeddedDocument OR
            (isArray(this[key]) &&              // isArray AND contains value AND value isEmbeddedDocument
            this[key].length > 0 &&
            isEmbeddedDocument(this[key][0]))) {

            // Handle array of references (ex: { type: [MyObject] })
            if (isArray(this[key])) {
              toUpdate[key] = [];
              this[key].forEach(value => toUpdate[key].push(value._toData()));
            } else {
              toUpdate[key] = this[key]._toData();
            }

          }
        });

        return toUpdate;
      })
      .then(data => {
        // TODO: hack?
        const postValidatePromises = [data].concat(this._getHookPromises('postValidate'));
        return Promise.all(postValidatePromises);
      })
      .then(prevData => {
        const data = prevData[0];
        // TODO: hack?
        const preSavePromises = [data].concat(this._getHookPromises('preSave'));
        return Promise.all(preSavePromises);
      })
      .then(prevData => {
        const data = prevData[0];
        return db().save(this.collectionName(), this._id, data);
      })
      .then(id => {
        if (this._id === null) {
          this._id = id;
        }
      })
      .then(() => {
        // TODO: hack?
        const postSavePromises = this._getHookPromises('postSave');
        return Promise.all(postSavePromises);
      })
      .then(() => this);
  }

  /**
   * Delete current document
   *
   * @returns {Promise}
   */
  delete() {
    const preDeletePromises = this._getHookPromises('preDelete');

    return Promise
      .all(preDeletePromises)
      .then(() => db().delete(this.collectionName(), this._id))
      .then(deleteReturn => {
        // TODO: hack?
        const postDeletePromises = [deleteReturn].concat(this._getHookPromises('postDelete'));
        return Promise.all(postDeletePromises);
      })
      .then(prevData => {
        const deleteReturn = prevData[0];
        return deleteReturn;
      });
  }

  /**
   * Delete one document in current collection
   *
   * @param {Object} query Query
   * @returns {Promise}
   */
  static deleteOne(query) {
    return db().deleteOne(this.collectionName(), query);
  }

  /**
   * Delete many documents in current collection
   *
   * @param {Object} query Query
   * @returns {Promise}
   */
  static deleteMany(query) {
    query = query || {};

    return db().deleteMany(this.collectionName(), query);
  }

  /**
   * Find one document in current collection
   *
   * TODO: Need options to specify whether references should be loaded
   *
   * @param {Object} query Query
   * @returns {Promise}
   */
  static findOne(query, options) {
    let populate = true;
    if (options && options.hasOwnProperty('populate')) {
      populate = options.populate;
    }

    return db()
      .findOne(this.collectionName(), query)
      .then(data => {
        if (!data) {
          return null;
        }

        const doc = this._fromData(data);
        if (populate === true || (isArray(populate) && populate.length > 0)) {
          return this.populate(doc, populate);
        }

        return doc;
      })
      .then(docs => {
        if (docs) {
          return docs;
        }
        return null;
      });
  }

  /**
   * Find one document and update it in current collection
   *
   * @param {Object} query Query
   * @param {Object} values
   * @param {Object} options
   * @returns {Promise}
   */
  static findOneAndUpdate(query, values, options) {
    if (values === undefined) {
      throw new Error('findOneAndUpdate requires at least 2 arguments.');
    }

    options = options || {};

    let populate = true;
    if (options.hasOwnProperty('populate')) {
      populate = options.populate;
    }

    return db().findOneAndUpdate(this.collectionName(), query, values, options)
      .then(data => {
        if (!data) {
          return null;
        }

        const doc = this._fromData(data);
        if (populate) {
          return this.populate(doc);
        }

        return doc;
      })
      .then(doc => doc || null);
  }

  /**
   * Find one document and delete it in current collection
   *
   * @param {Object} query Query
   * @param {Object} options
   * @returns {Promise}
   */
  static findOneAndDelete(query, options) {
    if (query === undefined) {
      throw new Error('findOneAndDelete requires at least 1 argument.');
    }

    options = options || {};

    return db().findOneAndDelete(this.collectionName(), query, options);
  }

  /**
   * Find documents
   *
   * TODO: Need options to specify whether references should be loaded
   *
   * @param {Object} query Query
   * @param {Object} options
   * @returns {Promise}
   */
  static find(query, options) {
    query = query || {};
    options = options || {populate: true}; // TODO: WHAT? WHY?

    return db()
      .find(this.collectionName(), query, options)
      .then(datas => {
        const docs = this._fromData(datas);

        if (options.populate === true ||
          (isArray(options.populate) && options.populate.length > 0)) {
          return this.populate(docs, options.populate);
        }

        return docs;
      })
      .then(docs => [].concat(docs)); // Ensure we always return an array
  }

  /**
   * Get count documents in current collection by query
   *
   * @param {Object} query Query
   * @returns {Promise}
   */
  static count(query) {
    return db().count(this.collectionName(), query);
  }

  /**
   * Create indexes
   *
   * @returns {Promise}
   */
  static createIndexes() {
    if (this._indexesCreated) {
      return;
    }

    const instance = this._instantiate();

    Object.keys(instance._schema).forEach(key => {
      if (instance._schema[key].unique) {
        db().createIndex(this.collectionName(), key, {unique: true});
      }
    });

    this._indexesCreated = true;
  }

  static _fromData(datas) {
    const instances = super._fromData(datas);
    // This way we preserve the original structure of the data. Data
    // that was passed as an array is returned as an array, and data
    // passes as a single object is returned as single object
    const datasArray = [].concat(datas);
    const instancesArray = [].concat(instances);

    /* for (const i = 0; i < instancesArray.length; i++) {
     if (datasArray[i].hasOwnProperty('_id')) {
     instancesArray[i]._id = datasArray[i]._id;
     } else {
     instancesArray[i]._id = null;
     }
     } */

    return instances;
  }

  /**
   * Clear current collection
   *
   * @returns {Promise}
   */
  static clearCollection() {
    return db().clearCollection(this.collectionName());
  }

}

module.exports = Document;
