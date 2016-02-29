"use strict";

var _ = require('lodash');
var deprecate = require('depd')('camo');
var DB = require('./clients').getClient;
var isSupportedType = require('./validate').isSupportedType;
var isValidType = require('./validate').isValidType;
var isEmptyValue = require('./validate').isEmptyValue;
var isInChoices = require('./validate').isInChoices;
var isArray = require('./validate').isArray;
var isDocument = require('./validate').isDocument;
var isEmbeddedDocument = require('./validate').isEmbeddedDocument;
var isString = require('./validate').isString;
var isNumber = require('./validate').isNumber;
var isDate = require('./validate').isDate;
var ValidationError = require('./errors').ValidationError;

var normalizeType = function(property) {
    // TODO: Only copy over stuff we support

    var typeDeclaration = {};
    if (property.type) {
        typeDeclaration = property;
    } else if (isSupportedType(property)) {
        typeDeclaration.type = property;
    } else {
        throw new Error('Unsupported type or bad variable. ' + 
            'Remember, non-persisted objects must start with an underscore (_). Got:', property);
    }

    return typeDeclaration;
};

class BaseDocument {
	constructor() {
        this._schema = {                            // Defines document structure/properties
            _id: { type: DB().nativeIdType() },     // Native ID to backend database
        };

        this._id = null;
    }

    // TODO: Is there a way to tell if a class is
    // a subclass of something? Until I find out
    // how, we'll be lazy use this.
    static documentClass() {
        throw new TypeError('You must override documentClass (static).');
    }

    documentClass() {
        throw new TypeError('You must override documentClass.');
    }

    collectionName() {
        // DEPRECATED
        // Getting ready to remove this functionality
        if (this._meta) {
            return this._meta.collection;
        }

        return this.constructor.collectionName();
    }

    static collectionName() {
        // DEPRECATED
        // Getting ready to remove this functionality
        var instance = new this();
        if (instance._meta) {
            return instance._meta.collection;
        }

        return this.name.toLowerCase() + 's';
    }

    get id() {
        deprecate('Document.id - use Document._id instead');
        return this._id;
    }

    set id(id) {
        deprecate('Document.id - use Document._id instead');
        this._id = id;
    }

    schema(extension) {
        var that = this;

        if (!extension) return;
        _.keys(extension).forEach(function(k) {
            that[k] = extension[k];
        });
    }

    /*
     * Pre/post Hooks
     *
     * To add a hook, the extending class just needs
     * to override the appropriate hook method below.
     */

    preValidate() { }

    postValidate() { }

    preSave() { }

    postSave() { }

    preDelete() { }

    postDelete() { }

    // TODO : EMBEDDED
    // Need to share this with embedded
    generateSchema() {
        var that = this;

        _.keys(this).forEach(function(k) {
            // Ignore private variables
            if (_.startsWith(k, '_')) {
                return;
            }

            // Normalize the type format
            that._schema[k] = normalizeType(that[k]);

            // Assign a default if needed
            if (isArray(that._schema[k].type)) {
                that[k] = that.getDefault(k) || [];
            } else {
                that[k] = that.getDefault(k);
            }
        });
    }

    validate() {
        var that = this;

        _.keys(that._schema).forEach(function(key) {
            var value = that[key];

            // TODO: This should probably be in Document, not BaseDocument
            if (value !== null && value !== undefined) {
                if (isEmbeddedDocument(value)) {
                    value.validate();
                    return;
                } else if (isArray(value) && value.length > 0 && isEmbeddedDocument(value[0])) {
                    value.forEach(function(v) {
                        if (v.validate) {
                            v.validate();
                        }
                    });
                    return;
                }
            }

            if (!isValidType(value, that._schema[key].type)) {
                // TODO: Formatting should probably be done somewhere else
                var typeName = null;
                var valueName = null;
                if (Array.isArray(that._schema[key].type) && that._schema[key].type.length > 0) {
                    typeName = '[' + that._schema[key].type[0].name + ']';
                } else if (Array.isArray(that._schema[key].type) && that._schema[key].type.length === 0) {
                    typeName = '[]';
                } else {
                    typeName = that._schema[key].type.name;
                }

                if (Array.isArray(value)) {
                    // TODO: Not descriptive enough! Strings can look like numbers
                    valueName = '[' + value.toString() + ']';
                } else {
                    valueName = typeof(value);
                }
                throw new ValidationError('Value assigned to ' + that.collectionName() + '.' + key +
                    ' should be ' + typeName + ', got ' + valueName);
            }

            if (that._schema[key].required && isEmptyValue(value)) {
                throw new ValidationError('Key ' + that.collectionName() + '.' + key +
                    ' is required' + ', but got ' + value);
            }

            if (that._schema[key].match && isString(value) && !that._schema[key].match.test(value)) {
                throw new ValidationError('Value assigned to ' + that.collectionName() + '.' + key +
                    ' does not match the regex/string ' + that._schema[key].match.toString() + '. Value was ' + value);
            }

            if (!isInChoices(that._schema[key].choices, value)) {
                throw new ValidationError('Value assigned to ' + that.collectionName() + '.' + key +
                    ' should be in choices [' + that._schema[key].choices.join(', ') + '], got ' + value);
            }

            if (isNumber(that._schema[key].min) && value < that._schema[key].min) {
                throw new ValidationError('Value assigned to ' + that.collectionName() + '.' + key +
                    ' is less than min, ' + that._schema[key].min + ', got ' + value);
            }

            if (isNumber(that._schema[key].max) && value > that._schema[key].max) {
                throw new ValidationError('Value assigned to ' + that.collectionName() + '.' + key +
                    ' is less than max, ' + that._schema[key].max + ', got ' + value);
            }

            if (typeof(that._schema[key].validate) === 'function' && !that._schema[key].validate(value)) {
                throw new ValidationError('Value assigned to ' + that.collectionName() + '.' + key +
                    ' failed custom validator. Value was ' + value);
            }
        });
    }

    /*
     * Right now this only canonicalizes dates (integer timestamps
     * get converted to Date objects), but maybe we should do the
     * same for strings (UTF, Unicode, ASCII, etc)?
     */
    canonicalize() {
        var that = this;

        _.keys(that._schema).forEach(function(key) {
            var value = that[key];
            
            if (that._schema[key].type === Date && isDate(value)) {
                that[key] = new Date(value);
            } else if (value !== null && value !== undefined && 
                value.documentClass && value.documentClass() === 'embedded') {
                // TODO: This should probably be in Document, not BaseDocument
                value.canonicalize();
                return;
            }
        });
    }

    static create(data) {
        this.createIndexes();

        if (typeof(data) !== 'undefined') {
            return this._fromData(data);
        }

        return this._instantiate();
    }

    static createIndexes() { }

    static _instantiate() {
        var instance = new this();
        instance.generateSchema();
        return instance;
    }

    // TODO: Should probably move some of this to 
    // Embedded and Document classes since Base shouldn't
    // need to know about child classes
    static _fromData(datas) {
        var that = this;

        if (!isArray(datas)) {
            datas = [datas];
        }

        var documents = [];
        var embeddedPromises = [];
        datas.forEach(function(d) {
            var instance = that._instantiate();
            _.keys(d).forEach(function(key) {
                var value = null;
                if (d[key] === null) {
                    value = instance.getDefault(key);
                } else {
                    value = d[key];
                }

                // If its not in the schema, we don't care about it... right?
                if (key in instance._schema) {

                    var type = instance._schema[key].type;

                    if (type.documentClass && type.documentClass() === 'embedded') {
                        // Initialize EmbeddedDocument
                        instance[key] = type._fromData(value);
                    } else if (isArray(type) && type.length > 0 && 
                        type[0].documentClass && type[0].documentClass() === 'embedded') {
                        // Initialize array of EmbeddedDocuments
                        instance[key] = [];
                        value.forEach(function(v, i) {
                            instance[key][i] = type[0]._fromData(v);
                        });
                    } else {
                        // Initialize primitive or array of primitives
                        instance[key] = value;
                    }
                } else if (key in instance) {
                    // Handles virtual setters
                    instance[key] = value;
                }
            });

            documents.push(instance);
        });

        if (documents.length === 1) {
            return documents[0];
        }
        return documents;
    }

    populate() {
        return BaseDocument.populate(this);
    }

    // TODO : EMBEDDED
    // 
    static populate(docs, fields) {
        if (!docs) return Promise.all([]);

        var documents = null;

        if (!isArray(docs)) {
            documents = [docs];
        } else if (docs.length < 1) {
            return Promise.all(docs);
        } else {
            documents = docs;
        }

        // Load all 1-level-deep references
        // First, find all unique keys needed to be loaded...
        var keys = [];

        // TODO: Bad assumption: Not all documents in the database will have the same schema...
        // Hmm, if this is true, thats an error on the user. Right?
        var anInstance = documents[0];

        _.keys(anInstance._schema).forEach(function(key) {
            // Only populate specified fields
            if (isArray(fields) && fields.indexOf(key) < 0) {
                return;
            }

            // Handle array of references (ex: { type: [MyObject] })
            if (isArray(anInstance._schema[key].type) &&
                anInstance._schema[key].type.length > 0 &&
                isDocument(anInstance._schema[key].type[0])) {
                keys.push(key);
            }
            // Handle anInstance[key] being a string id, a native id, or a Document instance
            else if ((isString(anInstance[key]) || DB().isNativeId(anInstance[key])) &&
                     isDocument(anInstance._schema[key].type)) {
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
                ids[k][DB().toCanonicalId(d._id)] = [].concat(d[k]);     // Handles values and arrays

                // Also, initialize document member arrays
                // to assign to later if needed
                if (isArray(d[k])) {
                    d[k] = [];
                }
            });
        });

        // TODO: Is this really the most efficient
        // way to do this? Maybe make a master list
        // of all objects that need to be loaded (separated
        // by type), load those, and then search through
        // ids to see where dereferenced objects should
        // go?

        // ...then for each array of ids, load them all...
        var loadPromises = [];
        _.keys(ids).forEach(function(key) {
            var keyIds = [];
            _.keys(ids[key]).forEach(function(k) {
                // Before adding to list, we convert id to the
                // backend database's native ID format.
                keyIds = keyIds.concat(ids[key][k]);
            });

            // Only want to load each reference once
            keyIds = _.unique(keyIds);

            // Handle array of references (like [MyObject])
            var type = null;
            if (isArray(anInstance._schema[key].type)) {
                type = anInstance._schema[key].type[0];
            } else {
                type = anInstance._schema[key].type;
            }

            // Bulk load dereferences
            var p = type.find({ '_id': { $in: keyIds } }, { populate: false })
            .then(function(dereferences) {
                // Assign each dereferenced object to parent

                _.keys(ids[key]).forEach(function(k) {
                    // TODO: Replace with documents.find when able
                    // Find the document to assign the derefs to
                    var doc;
                    documents.forEach(function(d) {
                        if (DB().toCanonicalId(d._id) === k) doc = d;
                    });

                    // For all ids to be dereferenced, find the
                    // deref and assign or push it
                    ids[key][k].forEach(function(id) {
                        // TODO: Replace with dereferences.find when able
                        // Find the right dereference
                        var deref;
                        dereferences.forEach(function(d) {
                            if (DB().toCanonicalId(d._id) === DB().toCanonicalId(id)) deref = d;
                        });

                        if (isArray(anInstance._schema[key].type)) {
                            doc[key].push(deref);
                        } else {
                            doc[key] = deref;
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
            this[schemaProp] = defVal;  // TODO: Wait... should we be assigning it here?
            return defVal;
        } else if (schemaProp === '_id') {
            return null;
        }

        return undefined;
    }

    toJSON() {
        var values = this._toData({_id: true});
        var schema = this._schema;
        for (var key in schema) {
            if (schema.hasOwnProperty(key)) {
                if (schema[key].private){
                    delete values[key];
                } else if (values[key] && values[key].toJSON) {
                    values[key] = values[key].toJSON();
                } else if (isArray(values[key])) {
                    var newArray = [];
                    values[key].forEach(function(i) {
                        if (i && i.toJSON) {
                            newArray.push(i.toJSON());
                        } else {
                            newArray.push(i);
                        }
                    });
                    values[key] = newArray;
                }
            }
        }
        var proto = Object.getPrototypeOf(this);
        var protoProps = Object.getOwnPropertyNames(proto);
        for (var i = 0; i < protoProps.length; i++) {
            key = protoProps[i];
            if (key !== 'constructor' && key !== 'id'){
                values[key] = this[key];
            }
        }
        return values;
    }

    _toData(keep) {
        var that = this;

        if (keep === undefined || keep === null) {
            keep = {};
        } else if (keep._id === undefined) {
            keep._id = true;
        }

        var values = {};
        _.keys(this).forEach(function(k) {
            if (_.startsWith(k, '_')) {
                if (k !== '_id' || !keep._id) {
                    return;
                } else {
                    values[k] = that[k];
                }
            } else if (isEmbeddedDocument(that[k])) {
                values[k] = that[k]._toData();
            } else if (isArray(that[k]) && that[k].length > 0 && isEmbeddedDocument(that[k][0])) {
                values[k] = [];
                that[k].forEach(function(v) {
                    values[k].push(v._toData());
                });
            } else {
                values[k] = that[k];
            }
        });

        return values;
    }

    _getEmbeddeds() {
        var that = this;

        var embeddeds = [];
        _.keys(this._schema).forEach(function(v) {
            if (isEmbeddedDocument(that._schema[v].type) ||
                (isArray(that._schema[v].type) && isEmbeddedDocument(that._schema[v].type[0]))) {
                embeddeds = embeddeds.concat(that[v]);
            }
        });
        return embeddeds;
    }

    _getHookPromises(hookName) {
        var embeddeds = this._getEmbeddeds();

        var hookPromises = [];
        hookPromises = hookPromises.concat(_.invoke(embeddeds, hookName));
        hookPromises.push(this[hookName]());
        return hookPromises;
    }
}

module.exports = BaseDocument;