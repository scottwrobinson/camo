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
  * <a href="#misc">Misc.</a>
* <a href="#transpiler-support">Transpiler Support</a>
* <a href="#contributing">Contributing</a>
* <a href="#contact">Contact</a>
* <a href="#copyright-license">Copyright & License</a>

**Note**: Since Camo is still pre-1.0, the API will likely change often. Please see the [CHANGELOG](https://github.com/scottwrobinson/camo/blob/master/CHANGELOG.md) for the latest API changes and bug fixes.

## Why do we need another ODM?
Short answer, we probably don't. Camo was created for two reasons: to bring traditional-style classes to [MongoDB](https://www.mongodb.com/) JavaScript, and to support [NeDB](https://github.com/louischatriot/nedb) as a backend (which is much like the SQLite-alternative to Mongo).

Throughout development this eventually turned in to a library full of [ES6](https://github.com/lukehoban/es6features) features. Coming from a Java background, its easier for me to design and write code in terms of classes, and I suspect this is true for many JavaScript beginners. While ES6 classes don't bring any new functionality to the language, they certainly do make it much easier to jump in to OOP with JavaScript, which is reason enough to warrent a new library, IMO.

## Advantages
So, why use Camo?

- **ES6**: ES6 features are quickly being added to Node, especially now that it has merged with io.js. With all of these new features being released, Camo is getting a head start in writing tested and proven ES6 code. This also means that native Promises are built-in to Camo, so no more `promisify`-ing your ODM or waiting for Promise support to be added natively.
- **Easy to use**: While JavaScript is a great language overall, it isn't always the easiest for beginners to pick up. Camo aims to ease that transition by providing familiar-looking classes and a simple interface. Also, there is no need to install a full MongoDB instance to get started thanks to the support of NeDB.
- **Multiple backends**: Camo was designed and built with multiple Mongo-like backends in mind, like NeDB, LokiJS\*, and TaffyDB\*. With NeDB support, for example, you don't need to install a full MongoDB instance for development or for smaller projects. This also allows you to use Camo in the browser, since databases like NeDB supports in-memory storage.
- **Lightweight**: Camo is just a very thin wrapper around the backend databases, which mean you won't be sacrificing performance.

\* Support coming soon.

## Install and Run
To use Camo, you must first have installed **Node >2.0.x** or **io.js >2.0.x**, then run the following commands:

	npm install camo --save

And at least ONE of the following:

	npm install nedb --save

	OR

	npm install mongodb --save

## Quick Start
Camo was built with ease-of-use and ES6 in mind, so you might notice it has more of an OOP feel to it than many existing libraries and ODMs. Don't worry, focusing on object-oriented design doesn't mean we forgot about functional techniques or asynchronous programming. Promises are built-in to the API. Just about every call you make interacting with the database (find, save, delete, etc) will return a Promise. No more callback hell :)

For a short tutorial on using Camo, check out [this](http://stackabuse.com/getting-started-with-camo/) article.

### Connect to the Database
Before using any document methods, you must first connect to your underlying database. All supported databases have their own unique URI string used for connecting. The URI string usually describes the network location or file location of the database. However, some databases support more than just network or file locations. NeDB, for example, supports storing data in-memory, which can be specified to Camo via `nedb://memory`. See below for details:

- MongoDB: 
  - Format: mongodb://[username:password@]host[:port][/db-name]
  - Example: `var uri = 'mongodb://scott:abc123@localhost:27017/animals';`
- NeDB:
  - Format: nedb://[directory-path] OR nedb://memory
  - Example: `var uri = 'nedb:///Users/scott/data/animals';`

So to connect to an NeDB database, use the following:

```javascript
var connect = require('camo').connect;

var database;
var uri = 'nedb:///Users/scott/data/animals';
connect(uri).then(function(db) {
    database = db;
});
```

### Declaring Your Document
All models must inherit from the `Document` class, which handles much of the interface to your backend NoSQL database.

```javascript
var Document = require('camo').Document;

class Company extends Document {
    constructor() {
        super();

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

    static collectionName() {
        return 'companies';
    }
}
```

Notice how the schema is declared right in the constructor as member variables. All _public_ member variables (variables that don't start with an underscore [_]) are added to the schema.

The name of the collection can be set by overriding the `static collectionName()` method, which should return the desired collection name as a string. If one isn't given, then Camo uses the name of the class and naively appends an 's' to the end to make it plural.

Schemas can also be defined using the `this.schema()` method. For example, in the `constructor()` method you could use:

```javascript
this.schema({
    name: String,
    valuation: {
        type: Number,
        default: 10000000000,
        min: 0
    },
    employees: [String],
    dateFounded: {
        type: Date,
        default: Date.now
    }
});
```

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

To declare a member variable in the schema, either directly assign it one of the types listed above, or assign it an object with options, like this:

```javascript
this.primeNumber = {
	type: Number,
	default: 2,
	min: 0,
	max: 25,
	choices: [2, 3, 5, 7, 11, 13, 17, 19, 23],
	unique: true
}
```

The `default` option supports both values and no-argument functions (like `Date.now`). Currently the supported options/validators are:

- `type`: The value's type *(required)*
- `default`: The value to be assigned if none is provided *(optional)*
- `min`: The minimum value a Number can be *(optional)*
- `max`: The maximum value a Number can be *(optional)*
- `choices`: A list of possible values *(optional)*
- `match`: A regex string that should match the value *(optional)*
- `validate`: A 1-argument function that returns `false` if the value is invalid *(optional)*
- `unique`: A boolean value indicating if a 'unique' index should be set *(optional)*
- `required`: A boolean value indicating if a key value is required *(optional)*

To reference another document, just use its class name as the type.

```javascript
class Dog extends Document {
    constructor() {
        super();

        this.name = String;
        this.breed = String;
    }
}

class Person extends Document {
    constructor() {
        super();

        this.pet = Dog;
        this.name = String;
        this.age = String;
    }

    static collectionName() {
        return 'people';
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
        super();
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
	console.log(l._id);
});
```

Once a document is saved, it will automatically be assigned a unique identifier by the backend database. This ID can be accessed by the `._id` property.

If you specified a default value (or function) for a schema variable, that value will be assigned on creation of the object.

An alternative to `.save()` is `.findOneAndUpdate(query, update, options)`. This static method will find and update (or insert) a document in one atomic operation (atomicity is guaranteed in MongoDB only). Using the `{upsert: true}` option will return a new document if one is not found with the given query.

### Loading
Both the find and delete methods following closely (but not always exactly) to the MongoDB API, so it should feel fairly familiar.

If querying an object by `id`, you _must_ use `_id` and **not** `id`.

To retrieve an object, you have a few methods available to you.

- `.findOne(query, options)` (static method)
- `.find(query, options)` (static method)

The `.findOne()` method will return the first document found, even if multiple documents match the query. `.find()` will return all documents matching the query. Each should be called as static methods on the document type you want to load.

```javascript
Dog.findOne({ name: 'Lassie' }).then(function(l) {
	console.log('Got Lassie!');
	console.log('Her unique ID is', l._id);
});
```

`.findOne()` currently accepts the following option:

- `populate`: Boolean value to load all or no references. Pass an array of field names to only populate the specified references
  - `Person.findOne({name: 'Billy'}, {populate: true})` populates all references in `Person` object
  - `Person.findOne({name: 'Billy'}, {populate: ['address', 'spouse']})` populates only 'address' and 'spouse' in `Person` object

`.find()` currently accepts the following options:

- `populate`: Boolean value to load all or no references. Pass an array of field names to only populate the specified references
  - `Person.find({lastName: 'Smith'}, {populate: true})` populates all references in `Person` object
  - `Person.find({lastName: 'Smith'}, {populate: ['address', 'spouse']})` populates only 'address' and 'spouse' in `Person` object
- `sort`: Sort the documents by the given field(s)
  - `Person.find({}, {sort: '-age'})` sorts by age in descending order
  - `Person.find({}, {sort: ['age', 'name']})` sorts by ascending age and then name, alphabetically
- `limit`: Limits the number of documents returned
  - `Person.find({}, {limit: 5})` returns a maximum of 5 `Person` objects
- `skip`: Skips the given number of documents and returns the rest
  - `Person.find({}, {skip: 5})` skips the first 5 `Person` objects and returns all others

### Deleting
To remove documents fromt the database, use one of the following:

- `.delete()`
- `.deleteOne(query, options)` (static method)
- `.deleteMany(query, options)` (static method)
- `.findOneAndDelete(query, options)` (static method)

The `.delete()` method should only be used on an instantiated document with a valid `id`. The other three methods should be used on the class of the document(s) you want to delete.

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
        super();

        this.employees = [Person]
    }

    static collectionName() {
        return 'companies';
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

### Misc.
- `camo.getClient()`: Retrieves the Camo database client
- `camo.getClient().driver()`: Retrieves the underlying database driver (`MongoClient` or a map of NeDB collections)
- `Document.toJSON()`: Serializes the given document to just the data, which includes nested and referenced data

## Transpiler Support
While many transpilers won't have any problem with Camo, some need extra resources/plugins to work correctly:

- Babel
  - [babel-preset-camo](https://github.com/scottwrobinson/babel-preset-camo): Babel preset for all es2015 plugins supported by Camo
- TypeScript
  - [DefinitelyTyped/camo](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/camo): Camo declaration file (h/t [lucasmciruzzi](https://github.com/lucasmciruzzi))
  - [IndefinitivelyTyped/camo](https://github.com/IndefinitivelyTyped/camo): Typings support for Camo (h/t [WorldMaker](https://github.com/WorldMaker))

## Contributing
Feel free to open new issues or submit pull requests for Camo. If you'd like to contact me before doing so, feel free to get in touch (see Contact section below).

Before opening an issue or submitting a PR, I ask that you follow these guidelines:

**Issues**
- Please state whether your issue is a question, feature request, or bug report.
- Always try the latest version of Camo before opening an issue.
- If the issue is a bug, be sure to clearly state your problem, what you expected to happen, and what all you have tried to resolve it.
- Always try to post simplified code that shows the problem. Use Gists for longer examples.

**Pull Requests**
- If your PR is a new feature, please consult with me first.
- Any PR should contain only one feature or bug fix. If you have more than one, please submit them as separate PRs.
- Always try to include relevant tests with your PRs. If you aren't sure where a test should go or how to create one, feel free to ask.
- Include updates to the README when needed.
- Do not update the package version or CHANGELOG. I'll handle that for each release.

## Contact
You can contact me with questions, issues, or ideas at either of the following:

- Email: [s.w.robinson+camo@gmail.com](mailto:s.w.robinson+camo@gmail.com)
- Twitter: [@ScottWRobinson](https://twitter.com/ScottWRobinson)

For short questions and faster responses, try Twitter.

## Copyright & License
Copyright (c) 2016 Scott Robinson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.