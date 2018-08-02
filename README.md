webext-pref
===========

A library to help creating scoped settings and options page in webextensions.

Features
--------

* Define an abstracted storage so it is possible to work with different storage systems e.g. [GM_webextPref](https://github.com/eight04/gm-webext-pref).
* Support multiple profiles, which allows you to apply config conditionally e.g. use different config on different domains.
* Build the options page by passing config names and labels.

Installation
------------

```
npm install webext-pref
```

Usage:

```js
const {createPref, createWebextStorage} = require("webext-pref");

// create the pref
const pref = createPref({
  useImage: true,
  excludeElements: "code, .highlight"
});

// connect to a storage and read values.
pref.connect(createWebextStorage())
  .then(() => {
    console.log(pref.get("useImage"));
  });
```

```js
// event pattern
const {createPref, createWebextStorage} = require("webext-pref");

// create the pref
const pref = createPref({
  useImage: true,
  excludeElements: "code, .highlight"
});

// update settings. Currently, getAll() returns default values.
updateSettings(pref.getAll());

// add event listener
pref.on("change", updateSettings);

// connect to a storage, if the value saved in the storage is different from
// the default, the listener would be called.
pref.connect(createWebextStorage());

function updateSettings(changes) {
  if (changes.useImage != null) {
    // useImage is changed...
  }
  if (changes.excludeElements != null) {
    // excludeElements is changed...
  }
}
```

API
----

This module exports following members:

* `createPref` - the core function to create a pref object.
* `createWebextStorage` - create a storage object using `browser.storage/chrome.storage`.
* `createView` - create a form builder.

### createPref

```js
const pref = createPref(defaults: Object, storage: Object);
```

Create a `pref` object.

* `defaults` - A map of `key` - `defaultValue` pairs.
* `storage` - You can create the storage object with `createGMStorage` or `createWebextStorage`.

#### pref.ready

```js
await pref.ready();
```

Wait until the `global` setting are read from the storage.

#### pref.setCurrentScope

```js
await pref.setCurrentScope(scope: String = "global");
```

Set the current scope and read the setting from the storage.

If the scope doesn't exist, it fallbacks to `"global"`.

#### pref.getCurrentScope

```js
const currentScope = pref.getCurrentScope();
```

Get the current scope.

#### pref.addScope

```js
await pref.addScope(scope: String);
```

Insert a new scope to the scope list.

#### pref.deleteScope

```js
await pref.deleteScope(scope: String);
```

Delete a scope from the scope list.

#### pref.getScopes

```js
const scopes = pref.getScopes();
```

Get the scope list.

#### pref.get

```js
const value = pref.get(key: String);
```

Get the value of `key` from the current scope. If the value doesn't exist, it fallbacks to `global` scope.

#### pref.set

```js
await pref.set(key: String, value: Any);
```

Set the value of `key` in the current scope. *This function returns a promise.*

#### events

`pref` extends `event-lite`, which has following methods to work with events:

```js
pref.on(event, callback);
pref.once(event, callback);
pref.off(event, callback);
```

`pref` emits following events:

* `change` - if the value of any key is changed. The callback would receive a `changes` object that is a `key` - `newValue` map.


### createWebextStorage

```js
const storage = createWebextStorage();
```

Create a storage object using `browser.storage.local/chrome.storage.local` API.

### createView

```js
const view = createView(pref: Object, body: Array);
```

Create a view object, which can draw HTML elements in the options page.

`body` is an array of form element object. Each element has following properties:

* `key: String` - the key of the pref. Only available if `type` is not `section`.
* `type: String` - the type of the element. Possible values are `text`, `number`, `checkbox`, `textarea`, `radio`, `select`, `color`, or `section`.
* `label: String` - the label of the form element.
* `help: String` - some help text for the form element.
* `learnMore: String` - a URL which the "Learn more" link points to.
* `children: Array` - a list of form elements. Only available if `type` is `section` or `checkbox`.

#### view.build

```js
const root = document.querySelector("#options");
const destroy = view.build(root);
```

Build HTML elements to the specified root.

When `destroy` function is called, the elements would be destroyed, event listeners are unbinded from elements and the pref.

Changelog
---------

* 0.1.0 (Next)

  - First release.
