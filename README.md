# Camo

## Jump To
* <a href="#why-do-we-need-another-odm">Why do we need another ODM?</a>
* <a href="#advantages">Advantages</a>
* <a href="#install-and-run">Install and Run</a>
* <a href="#quick-start">Quick Start</a>
  * <a href="#connect-to-the-database">Connect to the Database</a>
  * <a href="#declaring-your-document">Declaring Your Document</a>
    * <a href="#embedded-documents">Embedded Documents</a>
  * <a href="#creating-and-saving">Creating and Saving</a>
  * <a href="#loading">Loading</a>
  * <a href="#deleting">Deleting</a>
  * <a href="#counting">Counting</a>
  * <a href="#hooks">Hooks</a>
* <a href="#copyright-license">Copyright & License</a>

## Why do we need another ODM?
Short answer, we probably don't. Camo was created for two reasons: to bring traditional-style classes to [MongoDB](https://www.mongodb.com/) JavaScript, and to support [NeDB](https://github.com/louischatriot/nedb) as a backend (which is much like the SQLite-alternative to Mongo).

Throughout development this eventually turned in to a library full of [ES6](https://github.com/lukehoban/es6features) features. Coming from a Java background, its easier for me to design and write code in terms of classes, and I suspect this is true for many JavaScript beginners. While ES6 classes don't bring any new functionality to the language, they certainly do make it much easier to jump in to OOP with JavaScript, which is reason enough to warrent a new library, IMO.

## Advantages
So, why use Camo?

- **ES6**: Although ES6 hasn't hit mainstream Node yet, it will soon (io.js is currently being merged with Node at the time of this writing). With all of these new features coming out soon, Camo is getting a head start in writing tested and proven ES6 code. This also means that native Promises are built-in to Camo, so no more `promisify`-ing your ODM or waiting for Promise support to be added.
- **Easy to use**: While JavaScript is a great language overall, it isn't always the easiest for beginners to pick up. Camo aims to ease that transition by providing familiar-looking classes and a simple interface. Also, there is no need to install a full MongoDB instance to get started with the support of NeDB.
- **Multiple backends**: Camo was designed and built with multiple Mongo-like backends in mind, like NeDB, LokiJS\*, and TaffyDB\*. With NeDB support, for example, you don't need to install a full MongoDB instance for development or for smaller projects. This also allows you to use Camo in the browser, since it supports in-memory storage.
- **Lightweight**: Camo is just a very thin wrapper around the backend databases, which mean you won't be sacrificing performance.

\* Support coming soon.

## Install and Run
To use Camo, you must first have installed **io.js 2.0.0 or higher**, then run the following commands:

	npm install camo --save

And at least ONE of the following:

	npm install nedb --save

	OR

	npm install mongodb --save

_Note: Camo currently does not work with Node due to its lack of ES6 features. Node is currently merging with io.js, so hopefully we'll be able to support Node soon._

To run your application using Camo, as of now you must also use the `--harmony-proxies` flag:

    node --harmony-proxies index.js

We show this using the `node` command instead of `iojs` since io.js is typically aliased behind `node` when installed with Mac's [Homebrew](http://brew.sh/).

## Quick Start
Camo was built with ease-of-use and ES6 in mind, so you might notice it has more of an OOP feel to it than many existing libraries. Don't worry, focusing on object-oriented design doesn't mean we forgot about functional techniques or asynchronous programming. Promises are built-in to the API. Just about every call you make interacting with the database (load, save, delete, etc) will return a Promise. No more callback hell :)

### Connect to the Database
Before using any document methods, you must first connect to your underlying database. All supported databases have their own unique URL string used for connecting. The URL string usually describes the network location or file location of the database.

- MongoDB: 
  - Format: mongodb://[username:password@]host[:port][/db-name]
  - Example: `var url = 'mongodb://scott:abc123@localhost:27017/animals';`
- NeDB:
  - Format: nedb://[directory-path]
  - Example: `var url = 'nedb:///Users/scott/data/animals';`

So to connect to an NeDB database, use the following:

```javascript
var connect = require('camo').connect;

var database;
var url = 'nedb:///Users/scott/data/animals';
connect(url).then(function(db) {
    database = db;
});
```

### Declaring Your Document
All models must inherit from the `Document` class, which handles much of the interface to your backend NoSQL database.

```javascript
var Document = require('camo').Document;

class Company extends Document {
    constructor() {
        super('companies');

        this.name = String;
        this.valuation = {
        	type: Number,
        	default: 10000000000,
        	min: 0
        };
        this.employees = [String];
        this.dateFounded = {
        	type: Date,
        	default: Date.now
        };
    }
}
```

Notice how the schema is declared right in the constructor as member variables. All _public_ member variables (variables that don't start with an underscore [_]) are added to the schema. The `'boss'` string sent to the parent constructor tells us the collection name to use for that document type.

Currently supported variable types are:

- `String`
- `Number`
- `Boolean`
- `Buffer`
- `Date`
- `Object`
- `Array`
- `EmbeddedDocument`
- Document Reference

Arrays can either be declared as either un-typed (using `Array` or `[]`), or typed (using the `[TYPE]` syntax, like `[String]`). Typed arrays are enforced by Camo on `.save()` and an `Error` will be thrown if a value of the wrong type is saved in the array. Arrays of references are also supported.

To declare a member variable in the schema, either directly assign it one of the types above, or assign it an object with options. Like this:

```javascript
this.primeNumber = {
	type: Number,
	default: 2,
	min: 0,
	max: 25,
	choices: [2, 3, 5, 7, 11, 13, 17, 19, 23]
}
```

The `default` option supports both values and no-argument functions (like `Date.now`). Currently the supported options are:

- type
- default
- min
- max
- choices

To reference another document, just use its class name as the type.

```javascript
class Dog extends Document {
    constructor() {
        super('dogs');

        this.name = String;
        this.breed = String;
    }
}

class Person extends Document {
    constructor() {
        super('persons');

        this.pet = Dog;
        this.name = String;
        this.age = String;
    }
}
```

#### Embedded Documents
Embedded documents can also be used within `Document`s. You must declare them separately from the main `Document` that it is being used in. `EmbeddedDocument`s are good for when you need an `Object`, but also need enforced schemas, validation, defaults, hooks, and member functions. All of the options (type, default, min, etc) mentioned above work on `EmbeddedDocument`s as well.

```javascript
var Document = require('camo').Document;
var EmbeddedDocument = require('camo').EmbeddedDocument;

class Money extends EmbeddedDocument {
    constructor() {
        super();

        this.value = {
            type: Number,
            choices: [1, 5, 10, 20, 50, 100]
        };

        this.currency = {
            type: String,
            default: 'usd'
        }
    }
}

class Wallet extends Document {
    constructor() {
        super('wallet');
        this.contents = [Money];
    }
}

var wallet = Wallet.create();
wallet.contents.push(Money.create());
wallet.contents[0].value = 5;
wallet.contents.push(Money.create());
wallet.contents[1].value = 100;

wallet.save().then(function() {
    console.log('Both Wallet and Money objects were saved!');
});
````

### Creating and Saving
To create a new instance of our document, we need to use the `.create()` method, which handles all of the construction for us.

```javascript
var lassie = Dog.create({
    name: 'Lassie',
    breed: 'Collie'
});

lassie.save().then(function(l) {
	console.log(l.id);
});
```

Once a document is saved, it will automatically be assigned a unique identifier by the backend database. This ID can be accessed by either `.id` or `._id`.

If you specified a default value (or function) for a schema variable, that value will be assigned on creation of the object.

### Loading
Both the load and delete methods following closely (but not always exactly) to the MongoDB API, so it should feel fairly familiar. To retrieve an object, you have a few methods available to you.

- `.loadOne(query, options)` (static method)
- `.loadMany(query, options)` (static method)

The `.loadOne()` method will return the first document found, even if multiple documents match the query. `.loadMany()` will return all documents matching the query. Each should be called as static methods on the document type you want to load.

```javascript
Dog.loadOne({ name: 'Lassie' }).then(function(l) {
	console.log('Got Lassie!');
	console.log('Her unique ID is', l.id);
});
```

### Deleting
To remove documents fromt the database, use one of the following:

- `.delete()`
- `.deleteOne(query, options)` (static method)
- `.deleteMany(query, options)` (static method)

The `.delete()` method should only be used on an instantiated document with a valid `id`. The other two methods should be used on the class of the document(s) you want to delete.

```javascript
Dog.deleteMany({ breed: 'Collie' }).then(function(numDeleted) {
	console.log('Deleted', numDeleted, 'Collies from the database.');
});
```

### Counting
To get the number of matching documents for a query without actually retrieving all of the data, use the `.count()` method.

```javascript
Dog.count({ breed: 'Collie' }).then(function(count) {
	console.log('Found', count, 'Collies.');
});
```

### Hooks
Camo provides hooks for you to execute code before and after critical parts of your database interactions. For each hook you use, you may return a value (which, as of now, will be discarded) or a Promise for executing asynchronous code. Using Promises throughout Camo allows us to not have to provide separate async and sync hooks, thus making your code simpler and easier to understand.

Hooks can be used not only on `Document` objects, but `EmbeddedDocument` objects as well. The embedded object's hooks will be called when it's parent `Document` is saved/validated/deleted (depending on the hook you provide).

In order to create a hook, you must override a class method. The hooks currently provided, and their corresponding methods, are:

- pre-validate: `preValidate()`
- post-validate: `postValidate()`
- pre-save: `preSave()`
- post-save: `postSave()`
- pre-delete: `preDelete()`
- post-delete: `postDelete()`

Here is an example of using a hook (pre-delete, in this case):
```javascript
class Company extends Document {
    constructor() {
        super('companies');

        this.employees = [Person]
    }

    preDelete() {
        var deletes = [];
        this.employees.forEach(function(e) {
            var p = new Promise(function(resolve, reject) {
                resolve(e.delete());
            });

            deletes.push(p);
        });

        return Promise.all(deletes);
    }
}
```

The code above shows a pre-delete hook that deletes all the employees of the company before it itself is deleted. As you can see, this is much more convenient than needing to always remember to delete referenced employees in the application code.

**Note**: The `.preDelete()` and `.postDelete()` hooks are _only_ called when calling `.delete()` on a Document instance. Calling `.deleteOne()` or `.deleteMany()` will **not** trigger the hook methods.

## Copyright & License
Copyright (c) 2015 Scott Robinson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.