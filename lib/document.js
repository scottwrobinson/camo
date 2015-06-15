"use strict";

var _ = require('lodash');
var Reflect = require('harmony-reflect');   // Shim, remove ASAP
var DB = require('./clients').getClient;
var isValidType = require('./validate').isValidType;
var isInChoices = require('./validate').isInChoices;
var isArray = require('./validate').isArray;
var isModel = require('./validate').isModel;
var isString = require('./validate').isString;

// For more handler methods:
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy

let schemaProxyHandler = {
    get: function(target, propKey) {
        // Return current value, if set
        if (propKey in target._values 
            && target._values[propKey] !== null 
            && target._values[propKey] !== undefined) {
            return target._values[propKey];
        }

        // Alias 'id' and '_id'
        if (propKey === 'id') {
            return target._values['_id'];
        }

        // Maybe this hasn't been saved/loaded, so we
        // still need to grab the default value
        var def = target.getDefault(propKey);
        if (def !== null) {
            return def;
        }

        return Reflect.get(target, propKey);
    },

    set: function(target, propKey, value) {
        if (propKey in target._schema) {
            return target._values[propKey] = value;
        }

        // Alias 'id' and '_id'
        if (propKey === 'id') {
            return target._values['_id'] = value;
        }

        return Reflect.set(target, propKey, value);
    },

    deleteProperty: function(target, propKey) {
        return delete target._schema[propKey] && delete target._values[propKey];
    },

    has: function(target, propKey) {
        return propKey in target._schema || Reflect.has(target, propKey);
    }
}

class Document {
	constructor(name) {
        this._meta = {
            collection: name
        };

        this._schema = {                // Defines document structure/properties
            _id: { type: String }
        };
        this._values = {};              // Contains values for properties defined in schema
    }

    // TODO: Is there a way to tell if a class is
    // a subclass of something? Until I find out
    // how, we'll be lazy use this.
    static extendsDocument() {
        return true;
    }

    extendsDocument() {
        return true;
    }

    get id() {
    	return this._values._id;
    }

    set id(id) {
    	this._values._id = id;
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

    schema(extension) {
        if (!extension) return;
        _.extend(this._schema, extension);
    }

    save() {
        var that = this;

        return new Promise(function(resolve, reject) {

            // Ensure we at least have defaults set
            _.keys(that._schema).forEach(function(key) {
                if (!(key in that._values)) {
                    that._values[key] = that.getDefault(key);
                }
            });

            // Validate the assigned type, choices, and min/max
            _.keys(that._values).forEach(function(key) {
                var value = that._values[key];

                if (!isValidType(value, that._schema[key].type)) {
                    // TODO: Formatting should probably be done somewhere else
                    var typeName = null;
                    var valueName = null;
                    if (Array.isArray(that._schema[key].type)) {
                        typeName = '[' + that._schema[key].type[0].name + ']';
                    } else {
                        typeName = that._schema[key].type.name;
                    }

                    if (Array.isArray(value)) {
                        // TODO: Not descriptive enough! Strings can look like numbers
                        valueName = '[' + value.toString() + ']';
                    } else {
                        valueNmae = typeof(value);
                    }
                    var err = new Error('Value assigned to ' + that._meta.collection + '.' + key +
                        ' should be ' + typeName + ', got ' + valueName);
                    return reject(err);
                }

                if (!isInChoices(that._schema[key].choices, value)) {
                    var err = new Error('Value assigned to ' + that._meta.collection + '.' + key +
                        ' should be in [' + that._schema[key].choices.join(', ') + '], got ' + value);
                    return reject(err);
                }

                if (that._schema[key].min && value < that._schema[key].min) {
                    var err = new Error('Value assigned to ' + that._meta.collection + '.' + key +
                        ' is less than min, ' + that._schema[key].min + ', got ' + value);
                    return reject(err);
                }

                if (that._schema[key].max && value > that._schema[key].max) {
                    var err = new Error('Value assigned to ' + that._meta.collection + '.' + key +
                        ' is less than max, ' + that._schema[key].max + ', got ' + value);
                    return reject(err);
                }
            });

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
                if (isModel(that._values[key])                  // isModel OR
                    || (isArray(that._values[key])              // isArray AND contains value AND value isModel
                        && that._values[key].length > 0
                        && isModel(that._values[key][0]))) {

                    // Handle array of references (ex: { type: [MyObject] })
                    if (isArray(that._values[key])) {
                        toUpdate[key] = [];
                        that._values[key].forEach(function(v) {
                            toUpdate[key].push(v.id);
                        });
                    } else {
                        toUpdate[key] = that._values[key].id;
                    }

                }
            });

            DB().save(that._meta.collection, that.id, toUpdate)
            .then(function(data) {
                if (that.id === null) {
                    that.id = data._id;
                }
                resolve(that);
            })
            .catch(function(error) {
                reject(error);
            });
        });
    }

    delete() {
        return DB().delete(this._meta.collection, this.id);
    }

    static deleteOne(query) {
        return DB().deleteOne(this.collectionName(), query);
    }

    static deleteMany(query) {
        return DB().deleteMany(this.collectionName(), query);
    }

    // TODO: Need options to specify whether references should be loaded
    static loadOne(query) {
        var that = this;
        return DB().loadOne(this.collectionName(), query)
        .then(function(data) {
            if (!data) {
                return null;
            }

            var doc = that.fromData(data, that);
            return that.dereferenceDocuments(doc);
        });
    }

    // TODO: Need options to specify whether references should be loaded
    static loadMany(query) {
        var that = this;
        return DB().loadMany(this.collectionName(), query)
        .then(function(datas) {
            var documents = [];
            datas.forEach(function(d) {
                documents.push(that.fromData(d, that));
            });

            if (documents.length < 1) return documents;

            return that.dereferenceDocuments(documents);
        });
    }

    static clearCollection() {
        return DB().clearCollection(this.collectionName());
    }

    static create() {
        return new Proxy(new this(), schemaProxyHandler);
    }

    static fromData(data, clazz) {
        var instance = clazz.create();
        _.keys(data).forEach(function(key) {
            var value = null;
            if (data[key] === null) {
                value = instance.getDefault(key);
            } else {
                value = data[key];
            }

            // If its not in the schema, we don't care about it... right?
            if (key in instance._schema) {
                instance._values[key] = value;
            }
        });
        instance.id = data._id;
        return instance;
    }

    static dereferenceDocuments(docs) {
        if (!docs) return docs;

        var documents = null;

        if (!isArray(docs)) {
            documents = [docs];
        } else if (docs.length < 1) {
            return docs;
        } else {
            documents = docs;
        }

        // Load all 1-level-deep references
        // First, find all unique keys needed to be loaded...
        var keys = [];

        // TODO: Bad assumption: Not all documents in the database will have the same schema...
        // Hmm, if this is true, thats an error on the user. 
        var anInstance = documents[0];

        _.keys(anInstance._schema).forEach(function(key) {
            // Handle array of references (ex: { type: [MyObject] })
            if (isArray(anInstance._schema[key].type) 
                && anInstance._schema[key].type.length > 0
                && isModel(anInstance._schema[key].type[0])) {
                keys.push(key);
            }
            else if (isString(anInstance[key]) && isModel(anInstance._schema[key].type)) {
                keys.push(key);
            }
        });

        // ...then get all ids for each type of reference to be loaded...
        // ids = {
        //      houses: {
        //          'abc123': ['ak23lj', '2kajlc', 'ckajl32'],
        //          'l2jo99': ['28dsa0']
        //      },
        //      friends: {
        //          '1039da': ['lj0adf', 'k2jha']
        //      }
        //}
        var ids = {};
        keys.forEach(function(k) {
            ids[k] = {};
            documents.forEach(function(d) {
                ids[k][d.id] = [].concat(d[k]);     // Handles values and arrays

                // Also, initialize document member arrays
                // to assign to later if needed
                if (isArray(d[k])) {
                    d[k] = [];
                }
            });
        });

        // ...then for each array of ids, load them all...
        var loadPromises = [];
        _.keys(ids).forEach(function(key) {
            var keyIds = [];
            _.keys(ids[key]).forEach(function(k) {
                keyIds = keyIds.concat(ids[key][k]);
            });

            // Handle array of references (ex: [MyObject])
            var type = null;
            if (isArray(anInstance._schema[key].type)) {
                type = anInstance._schema[key].type[0];
            } else {
                type = anInstance._schema[key].type;
            }

            // Bulk load objects
            var p = type.loadMany({ '_id': { $in: keyIds } })
            .then(function(dereferences) {
                // Assign each dereferenced object to parent
                dereferences.forEach(function(deref) {
                    // For each model member...
                    _.keys(ids[key]).forEach(function(k) {
                        // ...if this dereference is in the array...
                        if (ids[key][k].indexOf(deref.id) > -1) {
                            // ...find the document it belongs to...
                            documents.forEach(function(doc) {
                                // ...and make the assignment (value or array-based).
                                if (doc.id === k) {
                                    if (isArray(anInstance._schema[key].type)) {
                                        doc[key].push(deref);
                                    } else {
                                        doc[key] = deref;
                                    }
                                }
                            });
                        }
                    });
                });
            });

            loadPromises.push(p);
        });

        // ...and finally execute all promises and return our
        // fully loaded documents.
        return Promise.all(loadPromises).then(function() {
            return docs;
        });
    }

    getDefault(schemaProp) {
        if (schemaProp in this._schema && 'default' in this._schema[schemaProp]) {
            var def = this._schema[schemaProp].default;
            var defVal = typeof(def) === 'function' ? def() : def;
            this._values[schemaProp] = defVal;  // TODO: Wait... should we be assigning it here?
            return defVal;
        }

        return null;
    }

    
}

exports.Document = Document;
exports.schemaProxyHandler = schemaProxyHandler;