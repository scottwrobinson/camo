'use strict';

const _ = require('lodash');
const deprecate = require('depd')('camo');
const db = require('./clients').getClient;
const isSupportedType = require('./validate').isSupportedType;
const isValidType = require('./validate').isValidType;
const isEmptyValue = require('./validate').isEmptyValue;
const isInChoices = require('./validate').isInChoices;
const isArray = require('./validate').isArray;
const isDocument = require('./validate').isDocument;
const isEmbeddedDocument = require('./validate').isEmbeddedDocument;
const isString = require('./validate').isString;
const isNumber = require('./validate').isNumber;
const isDate = require('./validate').isDate;
const ValidationError = require('./errors').ValidationError;

const normalizeType = function(property) {
  // TODO: Only copy over stuff we support

  let typeDeclaration = {};
  if (property.type) {
    typeDeclaration = property;
  } else if (isSupportedType(property)) {
    typeDeclaration.type = property;
  } else {
    throw new Error(`Unsupported type or bad constiable.
      Remember, non-persisted objects must start with an underscore (_). Got: ${property}`);
  }

  return typeDeclaration;
};

class BaseDocument {
  constructor() {
    this._schema = {                       // Defines document structure/properties
      _id: {type: db().nativeIdType()}     // Native ID to backend database
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

  /**
   * Get current collection name
   *
   * @returns {String}
   */
  static collectionName() {
    // DEPRECATED
    // Getting ready to remove this functionality
    const instance = new this();
    if (instance._meta) {
      return instance._meta.collection;
    }

    return `${this.name.toLowerCase()}s`;
  }

  get id() {
    deprecate('Document.id - use Document._id instead');
    return this._id;
  }

  set id(id) {
    deprecate('Document.id - use Document._id instead');
    this._id = id;
  }

  /**
   * set schema
   * @param {Object} extension
   */
  schema(extension) {
    if (!extension) {
      return;
    }

    Object.keys(extension).forEach(k => {
      this[k] = extension[k];
    });
  }

  /*
   * Pre/post Hooks
   *
   * To add a hook, the extending class just needs
   * to override the appropriate hook method below.
   */

  preValidate() {
  }

  postValidate() {
  }

  preSave() {
  }

  postSave() {
  }

  preDelete() {
  }

  postDelete() {
  }

  /**
   * Generate this._schema from fields
   *
   * TODO : EMBEDDED
   * Need to share this with embedded
   */
  generateSchema() {
    Object.keys(this).forEach(k => {
      // Ignore private constiables
      if (k.startsWith('_')) {
        return;
      }

      // Normalize the type format
      this._schema[k] = normalizeType(this[k]);

      // Assign a default if needed
      if (isArray(this._schema[k].type)) {
        this[k] = this.getDefault(k) || [];
      } else {
        this[k] = this.getDefault(k);
      }
    });
  }

  /**
   * Validate current document
   *
   * The method throw errors if document has invalid value
   *
   * TODO: This is not the right approach. The method needs to collect all errors in array and return them.
   */
  validate() {

    /* eslint complexity: 0 */
    Object.keys(this._schema).forEach(key => {
      const value = this[key];

      // TODO: This should probably be in Document, not BaseDocument
      if (value !== null && value !== undefined) {
        if (isEmbeddedDocument(value)) {
          value.validate();
          return;
        } else if (isArray(value) && value.length > 0 && isEmbeddedDocument(value[0])) {
          value.forEach(v => {
            if (v.validate) {
              v.validate();
            }
          });
          return;
        }
      }

      if (!isValidType(value, this._schema[key].type)) {
        // TODO: Formatting should probably be done somewhere else
        let typeName = null;
        let valueName = null;

        if (Array.isArray(this._schema[key].type) && this._schema[key].type.length > 0) {
          typeName = `[${this._schema[key].type[0].name}]`;
        } else if (Array.isArray(this._schema[key].type) && this._schema[key].type.length === 0) {
          typeName = '[]';
        } else {
          typeName = this._schema[key].type.name;
        }

        if (Array.isArray(value)) {
          // TODO: Not descriptive enough! Strings can look like numbers
          valueName = `[${value.toString()}]`;
        } else {
          valueName = typeof value;
        }

        throw new ValidationError(`Value assigned to ${this.collectionName()}.${key}
         should be ${typeName}, got ${valueName}`);
      }

      if (this._schema[key].required && isEmptyValue(value)) {
        throw new ValidationError(`Key ${this.collectionName()}.${key} is required, but got ${value}`);
      }

      if (this._schema[key].match && isString(value) && !this._schema[key].match.test(value)) {
        throw new ValidationError(`Value assigned to ${this.collectionName()}.${key} does not match the 
          regex/string ${this._schema[key].match.toString()}. Value was ${value}`);
      }

      if (!isInChoices(this._schema[key].choices, value)) {
        throw new ValidationError(`Value assigned to ${this.collectionName()}.${key} should be 
          in choices [${this._schema[key].choices.join(', ')}], got ${value}`);
      }

      if (isNumber(this._schema[key].min) && value < this._schema[key].min) {
        throw new ValidationError(`Value assigned to ${this.collectionName()}.${key} is less 
          than min, ${this._schema[key].min}, got ${value}`);
      }

      if (isNumber(this._schema[key].max) && value > this._schema[key].max) {
        throw new ValidationError(`Value assigned to ${this.collectionName()}.${key} is less 
          than max, ${this._schema[key].max}, got ${value}`);
      }

      if (typeof this._schema[key].validate === 'function' && !this._schema[key].validate(value)) {
        throw new ValidationError(`Value assigned to ${this.collectionName()}.${key} failed custom validator. 
          Value was ${value}`);
      }
    });
  }

  /*
   * Right now this only canonicalizes dates (integer timestamps
   * get converted to Date objects), but maybe we should do the
   * same for strings (UTF, Unicode, ASCII, etc)?
   */
  canonicalize() {
    Object.keys(this._schema).forEach(key => {
      const value = this[key];

      if (this._schema[key].type === Date && isDate(value)) {
        this[key] = new Date(value);
      } else if (value !== null && value !== undefined &&
        value.documentClass && value.documentClass() === 'embedded') {
        // TODO: This should probably be in Document, not BaseDocument
        value.canonicalize();
        return;
      }
    });
  }

  /**
   * Create new document from data
   *
   * @param {Object} data
   * @returns {Document}
   */
  static create(data) {
    this.createIndexes();

    if (typeof data !== 'undefined') {
      return this._fromData(data);
    }

    return this._instantiate();
  }

  static createIndexes() {
  }

  /**
   * Create new document from self
   *
   * @returns {BaseDocument}
   * @private
   */
  static _instantiate() {
    const instance = new this();

    instance.generateSchema();

    return instance;
  }

  // TODO: Should probably move some of this to
  // Embedded and Document classes since Base shouldn't
  // need to know about child classes
  /* eslint max-nested-callbacks: [2,5] */ // TODO: To reduce the number of nested callbacks
  static _fromData(datas) {
    if (!isArray(datas)) {
      datas = [datas];
    }

    const documents = [];
    datas.forEach(data => {
      const instance = this._instantiate();

      Object.keys(data).forEach(key => {
        let value = null;

        if (data[key] === null) {
          value = instance.getDefault(key);
        } else {
          value = data[key];
        }

        // If its not in the schema, we don't care about it... right?
        if (key in instance._schema) {
          const type = instance._schema[key].type;

          if (type.documentClass && type.documentClass() === 'embedded') {

            // Initialize EmbeddedDocument
            instance[key] = type._fromData(value);
          } else if (isArray(type) && type.length > 0 &&
            type[0].documentClass && type[0].documentClass() === 'embedded') {

            // Initialize array of EmbeddedDocuments
            instance[key] = [];
            value.forEach((v, i) => {
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

  /**
   * Populates document references
   *
   * TODO : EMBEDDED
   * @param {Array|Document} docs
   * @param {Array} fields
   * @returns {Promise}
   */
  static populate(docs, fields) {
    if (!docs) {
      return Promise.resolve([]);
    }

    let documents = null;

    if (!isArray(docs)) {
      documents = [docs];
    } else if (docs.length < 1) {
      return Promise.all(docs);
    } else {
      documents = docs;
    }

    // Load all 1-level-deep references
    // First, find all unique keys needed to be loaded...
    const keys = [];

    // TODO: Bad assumption: Not all documents in the database will have the same schema...
    // Hmm, if this is true, thats an error on the user. Right?
    const anInstance = documents[0];

    Object.keys(anInstance._schema).forEach(key => {
      // Only populate specified fields
      if (isArray(fields) && fields.indexOf(key) < 0) {
        return;
      }

      // Handle array of references (ex: { type: [MyObject] })
      if (isArray(anInstance._schema[key].type) &&
        anInstance._schema[key].type.length > 0 &&
        isDocument(anInstance._schema[key].type[0])) {
        keys.push(key);

        // Handle anInstance[key] being a string id, a native id, or a Document instance
      } else if ((isString(anInstance[key]) || db().isNativeId(anInstance[key])) &&
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
    // }
    const ids = {};
    keys.forEach(key => {
      ids[key] = {};
      documents.forEach(document => {
        ids[key][db().toCanonicalId(document._id)] = [].concat(document[key]);     // Handles values and arrays

        // Also, initialize document member arrays
        // to assign to later if needed
        if (isArray(document[key])) {
          document[key] = [];
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
    const loadPromises = [];
    Object.keys(ids).forEach(key => {

      let keyIds = [];
      Object.keys(ids[key]).forEach(k => {
        // Before adding to list, we convert id to the
        // backend database's native ID format.
        keyIds = keyIds.concat(ids[key][k]);
      });

      // Only want to load each reference once
      keyIds = _.unique(keyIds);

      // Handle array of references (like [MyObject])
      let type = null;
      if (isArray(anInstance._schema[key].type)) {
        type = anInstance._schema[key].type[0];
      } else {
        type = anInstance._schema[key].type;
      }

      // Bulk load dereferences
      const promise = type.find({_id: {$in: keyIds}}, {populate: false})
        .then(dereferences => {
          // Assign each dereferenced object to parent

          Object.keys(ids[key]).forEach(k => {
            // TODO: Replace with documents.find when able
            // Find the document to assign the derefs to
            let doc = null;
            documents.forEach(document => {
              if (db().toCanonicalId(document._id) === k) {
                doc = document;
              }
            });

            // For all ids to be dereferenced, find the
            // deref and assign or push it
            ids[key][k].forEach(id => {
              // TODO: Replace with dereferences.find when able
              // Find the right dereference
              let deref = null;
              dereferences.forEach(dereference => {
                if (db().toCanonicalId(dereference._id) === db().toCanonicalId(id)) {
                  deref = dereference;
                }
              });

              /* eslint no-underscore-dangle: 0 */
              if (isArray(anInstance._schema[key].type)) {
                doc[key].push(deref);
              } else {
                doc[key] = deref;
              }
            });
          });
        });

      loadPromises.push(promise);
    });

    // ...and finally execute all promises and return our
    // fully loaded documents.
    return Promise
      .all(loadPromises)
      .then(() => docs);
  }

  /**
   * Get default value
   *
   * @param {String} schemaProp Key of current schema
   * @returns {*}
   */
  getDefault(schemaProp) {
    if (schemaProp in this._schema && 'default' in this._schema[schemaProp]) {
      const def = this._schema[schemaProp].default;
      const defValue = typeof def === 'function' ? def() : def;
      this[schemaProp] = defValue;  // TODO: Wait... should we be assigning it here?

      return defValue;
    } else if (schemaProp === '_id') {
      return null;
    }

    return undefined;
  }

  /**
   * For JSON.Stringify
   *
   * @returns {*}
   */
  toJSON() {
    const values = this._toData({_id: true});
    const schema = this._schema;
    Object.keys(schema).forEach(key => {
      if (schema[key].private) {
        delete values[key];

      } else if (values[key] && values[key].toJSON) {
        values[key] = values[key].toJSON();

      } else if (isArray(values[key])) {
        const newArray = [];
        values[key].forEach(value => {
          if (value && value.toJSON) {
            newArray.push(value.toJSON());
          } else {
            newArray.push(value);
          }
        });
        values[key] = newArray;
      }
    });

    return values;
  }

  /**
   *
   * @param keep
   * @returns {{}}
   * @private
   */
  _toData(keep) {
    if (keep === undefined || keep === null) {
      keep = {};
    } else if (keep._id === undefined) {
      keep._id = true;
    }

    const values = {};
    Object.keys(this).forEach(key => {
      if (key.startsWith('_')) {
        if (key !== '_id' || !keep._id) {
          return;
        }

        values[key] = this[key];

      } else if (isEmbeddedDocument(this[key])) {
        values[key] = this[key]._toData();

      } else if (isArray(this[key]) && this[key].length > 0 && isEmbeddedDocument(this[key][0])) {
        values[key] = [];
        this[key].forEach(value => values[key].push(value._toData()));

      } else {
        values[key] = this[key];
      }
    });

    return values;
  }

  _getEmbeddeds() {
    let embeddeds = [];

    Object.keys(this._schema).forEach(key => {
      if (isEmbeddedDocument(this._schema[key].type) ||
        (isArray(this._schema[key].type) && isEmbeddedDocument(this._schema[key].type[0]))) {
        embeddeds = embeddeds.concat(this[key]);
      }
    });

    return embeddeds;
  }

  _getHookPromises(hookName) {
    const embeddeds = this._getEmbeddeds();

    let hookPromises = [];
    hookPromises = hookPromises.concat(_.invoke(embeddeds, hookName));
    hookPromises.push(this[hookName]());
    return hookPromises;
  }
}

module.exports = BaseDocument;
