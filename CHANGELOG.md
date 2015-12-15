## 0.11.0 (2015-12-15)

Features:
 - `--harmony-proxies` flag is no longer required
 - Class names declared in `static collectionName()`. Declaration through constructor is depracated ([#16](https://github.com/scottwrobinson/camo/issues/16))
 - Added new 'required' schema property ([#18](https://github.com/scottwrobinson/camo/issues/18) and [#19](https://github.com/scottwrobinson/camo/pull/19))
Bugfixes:
 - Fixed some inconsistencies with `id` aliasing (partial fix to [#20](https://github.com/scottwrobinson/camo/issues/20))

## 0.10.0 (2015-11-12)

Features:
 - Added support for setting the 'unique' index on a field
 - Added support for specifying which reference fields should be populated in `loadOne()` and `loadMany()`
Bugfixes:
 - Fixed issue in `isNativeId` where we weren't returning a proper Boolean.

## 0.9.1 (2015-11-06)

Features:
 - Added support for testing in travis-ci.org
Bugfixes:
 - Fixed issue #10 where IDs in queries had to be ObjectId. Now string IDs are automatically cast to ObjectId.

## 0.9.0 (2015-10-30)

Features:
 - Added support for `sort` option on `.loadMany()`
 - Added support for `limit` option on `.loadMany()`
 - Added support for `skip` option on `.loadMany()`
 - Added `.toJSON()` to `Document` and `EmbeddedDocument` for serialization
 - Updated 'engines' property to '>=2.0.0' in package.json
Bugfixes:
 - Fixed issue #14 where `Document`s couldn't be initialized with an array of `EmbeddedDocument` objects via `.create()`

## 0.8.0 (2015-10-12)

Features:
 - Added support for custom validation on schemas via `validate` property
Bugfixes:
 - Fixed issue #9 where no member values could be set as `undefined`

## 0.7.1 (2015-08-21)

Bugfixes:
 - Fixed issue #8 where virtual setters were not used on initialization
 - `loadMany()` now loads all documents if query is not provided
 - `deleteMany()` now deletes all documents if query is not provided

## 0.7.0 (2015-08-18)

Features:
 - Added `loadOneAndUpdate` static method to `Document` class
 - Added `loadOneAndDelete` static method to `Document` class

## 0.6.0 (2015-08-10)

Features:
 - Added in-memory support for NeDB
 - Added regex validator to `Document`

## 0.5.7 (2015-08-06)

Bugfixes:
 - Fixed issue where `schema()` wasn't canonicalizing schema definitions.
 - Updated README to show an example of using `schema()`.

## 0.5.6 (2015-07-20)

Features:
 - README additions
 - New test for overriding schemas

## 0.5.5 (2015-07-15)

Bugfixes:
 - Fixed issue where _id was being reassigned in Mongo, and fixed issue with populating references in Mongo.
 - Fixed issue with Mongo driver where reference validation checks failed.
 - Fixed test Issues.#4 for when running in Mongo.

## 0.5.4 (2015-07-09)

Bugfixes:
 - Fixed issue where `Date`s were saved in different formats (integers, `Date` objects, etc). Added way to canonicalize them so all dates look the same in the DB and are also loaded as Date objects.

## 0.5.3 (2015-07-01)

Bugfixes:
 - Fixed issue in `.loadMany()` where references in arrays were getting loaded too many times. ([#4](https://github.com/scottwrobinson/camo/issues/4)).
   - Added test in issues.test.js
 - Fixed issue in `.loadMany()` where muliple references to the same object were only getting loaded once. ([#5](https://github.com/scottwrobinson/camo/issues/5)).
   - Added test in issues.test.js

## 0.5.2 (2015-06-30)

 - Version bump, thanks to NPM.

## 0.5.1 (2015-06-30)

Bugfixes:
 - Fixed validation and referencing so `Document`s can be referenced by their object or ID.

## 0.5.0 (2015-06-26)

Features:
 - Exposed `getClient()` method for retrieving the active Camo client.
 - Added `options` parameter to `connect()` so options can be passed to backend DB client.
 - Static method `Document.fromData()` is now a private helper method. Static method `.create()` should be used instead.

Bugfixes:
 - In `Document._fromData()`, added check to see if ID exists before assigning
 - Changed `BaseDocument._fromData()` so it returns data in same form as it was passed.
   + i.e. Array of data returned as array, single object returned as single object.
 - Fixed bug where assigning an array of Documents in `.create()` lost the references.
 - Stopped using the depracated `_.extend()` alias. Now using `_.assign()` instead. ([#1](https://github.com/scottwrobinson/camo/issues/1)).
 - Fixed `get` and `set` issue with Proxy ([#3](https://github.com/scottwrobinson/camo/issues/3)).

## 0.4.0 (2015-06-22)

Features:
 - Changed `.isModel()` to `.isDocument()`.
 - Added `EmbeddedDocument` class and tests.
   + The following features work with `EmbeddedDocument`s:
     = Schema options: default, min, max, type, choices
     = All types supported in `Document` also work in `EmbeddedDocument`
     = Array of `EmbeddedDocument`s
     = Pre/post validate, save, and delete hooks

## 0.3.2 (2015-06-19)

Bugfix:
 - Added forked version of `harmony-reflect`. Only difference is it uses a global to ensure it runs only once.

## 0.3.1 (2015-06-19)

Bugfix:
 - Moved Proxy/Reflect shim to index. Seems to fix problem where shim broke Proxies (even worse).

## 0.3.0 (2015-06-18)

Features:
 - Added support for MongoDB using [node-mongodb-native](https://www.npmjs.com/package/mongodb) as the backend.
 - Added `.toCanonicalId()` and `.isNativeId()` to `DatabaseClient` and its child classes.

## 0.2.1 (2015-06-17)

 - README fix.

## 0.2.0 (2015-06-17)

Features:

 - Added the following Document hooks:
   - `preValidate()`
   - `postValidate()`
   - `preSave()`
   - `postSave()`
   - `preDelete()`
   - `postDelete()`

## 0.1.1 (2015-06-17)

Features:

 - Updated README to include 'javascript' declaration for syntax highlighting.
 - Added 'homepage' to package.json.
 - Added 'repository' to package.json.
 - Added 'email' to 'author' in package.json.

## 0.1.0 (2015-06-17)

Features:

 - Minor version bump.
 - No longer need to use `.schema()` in Document subclass. Now all public variables (any variable not starting with an underscore) are used in the schema.
 - Implemented `.count()` in Document, Client, and NeDbClient to get Document count without retrieving data.
 - Added `options` parameter to `.loadOne()` and `.loadMany()` to specify whether references should be populated.
 - Added support for circular dependencies.
 - Added README.
 - Added CHANGELOG.


## 0.0.1 (2015-06-15)

Initial release.