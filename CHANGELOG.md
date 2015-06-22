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