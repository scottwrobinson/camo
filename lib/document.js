"use strict";

var _ = require('lodash');
var DB = require('./clients').getClient;
var BaseDocument = require('./base-document');
var isSupportedType = require('./validate').isSupportedType;
var isArray = require('./validate').isArray;
var isReferenceable = require('./validate').isReferenceable;
var isEmbeddedDocument = require('./validate').isEmbeddedDocument;
var isString = require('./validate').isString;

class Document extends BaseDocument {
	constructor(name) {
        super();

        this._meta = {
            collection: name
        };
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

    static collectionName() {
        // TODO: Please tell me there is a better way 
        // to do this...
        // This was the easiest way I could figure out
        // how to access child-specified data in a 
        // single method without knowing anything
        // about the child class at runtime. 
        var instance = new this();
        return instance._meta.collection;
    }

    save() {
        var that = this;

        // TODO: Should we generate a list of embeddeds on creation?
        var embeddeds = [];
        _.keys(this._values).forEach(function(v) {
            if (isEmbeddedDocument(that._schema[v].type) ||
                (isArray(that._schema[v].type) && isEmbeddedDocument(that._schema[v].type[0]))) {
                embeddeds = embeddeds.concat(that._values[v]);
            }
        });

        // Also need to call pre/post functions for embeddeds
        var preValidatePromises = [];
        preValidatePromises = preValidatePromises.concat(_.invoke(embeddeds, 'preValidate'));
        preValidatePromises.push(that.preValidate());

        return Promise.all(preValidatePromises).then(function() {

            // Ensure we at least have defaults set

            // TODO: We already do this on .create(), so
            // should it really be done again?
            _.keys(that._schema).forEach(function(key) {
                if (!(key in that._values)) {
                    that._values[key] = that.getDefault(key);
                }
            });

            // Validate the assigned type, choices, and min/max
            that.validate();

            // Ensure all data types are saved in the same encodings
            that.canonicalize();

            // TODO: We should instead track what has changed and
            // only update those values. Maybe make that._changed
            // object to do this.
            // Also, this might be really slow for objects with
            // lots of references. Figure out a better way.
            var toUpdate = _.clone(that._values);

            // Don't give user a way to try and change id
            delete toUpdate._id;

            // Reference our objects
            _.keys(that._values).forEach(function(key) {
                if (isReferenceable(that._values[key]) ||            // isReferenceable OR
                    (isArray(that._values[key]) &&              // isArray AND contains value AND value isReferenceable
                    that._values[key].length > 0 &&
                    isReferenceable(that._values[key][0]))) {

                    // Handle array of references (ex: { type: [MyObject] })
                    if (isArray(that._values[key])) {
                        toUpdate[key] = [];
                        that._values[key].forEach(function(v) {
                            if (DB().isNativeId(v)) {
                                toUpdate[key].push(v);
                            } else {
                                toUpdate[key].push(v.id);
                            }
                        });
                    } else {
                        if (DB().isNativeId(that._values[key])) {
                            toUpdate[key] = that._values[key];
                        } else {
                            toUpdate[key] = that._values[key].id;
                        }
                    }

                }
            });

            // Replace EmbeddedDocument references with just their data
            _.keys(that._values).forEach(function(key) {
                if (isEmbeddedDocument(that._values[key]) ||               // isEmbeddedDocument OR
                    (isArray(that._values[key]) &&              // isArray AND contains value AND value isEmbeddedDocument
                    that._values[key].length > 0 &&
                    isEmbeddedDocument(that._values[key][0]))) {

                    // Handle array of references (ex: { type: [MyObject] })
                    if (isArray(that._values[key])) {
                        toUpdate[key] = [];
                        that._values[key].forEach(function(v) {
                            toUpdate[key].push(v.toData());
                        });
                    } else {
                        toUpdate[key] = that._values[key].toData();
                    }

                }
            });

            return toUpdate;
        }).then(function(data) {
            var postValidatePromises = [];
            postValidatePromises.push(data);    // TODO: hack?
            postValidatePromises = postValidatePromises.concat(_.invoke(embeddeds, 'postValidate'));
            postValidatePromises.push(that.postValidate());
            return Promise.all(postValidatePromises);
        }).then(function(prevData) {
            var data = prevData[0];
            var preSavePromises = [];
            preSavePromises.push(data);    // TODO: hack?
            preSavePromises = preSavePromises.concat(_.invoke(embeddeds, 'preSave'));
            preSavePromises.push(that.preSave());
            return Promise.all(preSavePromises);
        }).then(function(prevData) {
            var data = prevData[0];
            return DB().save(that._meta.collection, that.id, data);
        }).then(function(id) {
            if (that.id === null) {
                that.id = id;
            }
        }).then(function() {
            var postSavePromises = [];
            postSavePromises = postSavePromises.concat(_.invoke(embeddeds, 'postSave'));
            postSavePromises.push(that.postSave());
            return Promise.all(postSavePromises);
        }).then(function() {
            return that;
        }).catch(function(error) {
            return Promise.reject(error);
        });
    }

    delete() {
        var that = this;

        var embeddeds = [];
        _.keys(this._values).forEach(function(v) {
            if (isEmbeddedDocument(that._schema[v].type) ||
                (isArray(that._schema[v].type) && isEmbeddedDocument(that._schema[v].type[0]))) {
                embeddeds = embeddeds.concat(that._values[v]);
            }
        });

        
        var preDeletePromises = [];
        preDeletePromises = preDeletePromises.concat(_.invoke(embeddeds, 'preDelete'));
        preDeletePromises.push(that.preDelete());

        return Promise.all(preDeletePromises).then(function() {
            return DB().delete(that._meta.collection, that.id);
        }).then(function(deleteReturn) {
            var postDeletePromises = [];
            postDeletePromises.push(deleteReturn);    // TODO: hack?
            postDeletePromises = postDeletePromises.concat(_.invoke(embeddeds, 'postDelete'));
            postDeletePromises.push(that.postDelete());
            return Promise.all(postDeletePromises);
        }).then(function(prevData) {
            var deleteReturn = prevData[0];
            return deleteReturn;
        });
    }

    static deleteOne(query) {
        return DB().deleteOne(this.collectionName(), query);
    }

    static deleteMany(query) {
        return DB().deleteMany(this.collectionName(), query);
    }

    // TODO: Need options to specify whether references should be loaded
    static loadOne(query, options) {
        var that = this;

        var populate = true;
        if (options && options.hasOwnProperty('populate')) {
            populate = options.populate;
        }

        return DB().loadOne(this.collectionName(), query)
        .then(function(data) {
            if (!data) {
                return null;
            }

            var doc = that._fromData(data);
            if (populate) {
                return that.populate(doc);
            }

            return doc;
        }).then(function(docs) {
            if (docs) {
                return docs;
            }
            return null;
        });
    }

    // TODO: Need options to specify whether references should be loaded
    static loadMany(query, options) {
        var that = this;

        var populate = true;
        if (options && options.hasOwnProperty('populate')) {
            populate = options.populate;
        }

        return DB().loadMany(this.collectionName(), query)
        .then(function(datas) {
            var docs = that._fromData(datas);
            if (populate) {
                return that.populate(docs);
            }
            return docs;
        }).then(function(docs) {
            // Ensure we always return an array
            return [].concat(docs);
        });
    }

    static count(query) {
        var that = this;
        return DB().count(this.collectionName(), query);
    }

    static _fromData(datas) {
        var instances = super._fromData(datas);
        // This way we preserve the original structure of the data. Data
        // that was passed as an array is returned as an array, and data
        // passes as a single object is returned as single object
        var datasArray = [].concat(datas);
        var instancesArray = [].concat(instances);

        for (var i = 0; i < instancesArray.length; i++) {
            if (datasArray[i].hasOwnProperty('_id')) {
                instancesArray[i].id = datasArray[i]._id;
            } else {
                instancesArray[i].id = null;
            }
        }
        
        return instances;
    }

    static clearCollection() {
        return DB().clearCollection(this.collectionName());
    }
    
}

module.exports = Document;