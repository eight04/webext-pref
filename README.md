webext-pref
===========

[![Build Status](https://travis-ci.com/eight04/webext-pref.svg?branch=master)](https://travis-ci.com/eight04/webext-pref)
[![codecov](https://codecov.io/gh/eight04/webext-pref/branch/master/graph/badge.svg)](https://codecov.io/gh/eight04/webext-pref)

A library to help creating scoped settings and options page in webextensions.

Features
--------

* Define an abstracted storage so it is possible to work with different storage systems e.g. [GM_webextPref](https://github.com/eight04/GM_webextPref).
* Support multiple scopes (profiles), which allows you to apply config conditionally e.g. use different config on different domains.
* Build the options page by passing config names and labels. See [webext-pref-ui](https://github.com/eight04/webext-pref-ui)

Installation
------------

```
npm install webext-pref
```

Usage
-----

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

Event pattern:

```js
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
* `createMemoryStorage` - create a storage object using memory store.

### createPref

```js
createPref(default: Object<key: String, value: any>, separator: String = "/") => Pref
```

Create a `pref` object.

`default` is a `key` -> `defaultValue` object map.

`separator` would be used as the separator between the scope name and the actual key. You should choose a separator that won't appear in the key or the scope name.

#### pref.connect

```js
async pref.connect(storage: Object) => void
```

Connect to a storage object then read the `global` settings into the pref object.

#### pref.disconnect

```js
pref.disconnect() => void
```

Disconnect from the storage object and unregister event listeners.

#### pref.setCurrentScope

```js
async pref.setCurrentScope(scope: String) => success: Boolean
```

Set the current scope and read the setting from the storage.

If the scope doesn't exist, the scope won't change and `success` will be `false`.

#### pref.getCurrentScope

```js
pref.getCurrentScope() => currentScope: String
```

Get the current scope.

#### pref.addScope

```js
async pref.addScope(scope: String) => void
```

Insert a new scope to the scope list.

#### pref.deleteScope

```js
async pref.deleteScope(scope: String) => void
```

Delete a scope from the scope list.

#### pref.getScopeList

```js
pref.getScopeList() => Array<scope: String>
```

Get the scope list.

#### pref.get

```js
pref.get(key: String) => value: Any
```

Get the value of `key` from the current scope. If the value doesn't exist, it fallbacks to `global` scope.

#### pref.set

```js
async pref.set(key: String, value: Any) => void
```

Set the value of `key` in the current scope. *This function returns a promise.*

#### pref.has

```js
pref.has(key: String) => Boolean
```

Check if the pref contains `key`.

#### pref.export

```js
async pref.export() => exportedData: Object
```

Export all settings from the storage. You can store the data as text using `JSON.stringify`.

#### pref.import

```js
async pref.import(exportedData: Object) => void
```

Import settings into the storage.

#### events

`pref` extends `event-lite`, which has following methods to work with events:

```js
pref.on(event, callback);
pref.once(event, callback);
pref.off(event, callback);
```

`pref` emits following events:

* `change` - if the value of any key is changed. The callback would receive a `changes` object that is a `key` -> `newValue` map.


### createWebextStorage

```js
createWebextStorage(area?: String, prefix?: String) => WebextStorage
```

Create a storage object which implements the `Storage` interface and is built on top of `browser.storage`/`chrome.storage` extension API.

`area` could be `"local"` or `"sync"`. Default: `"local"`.

`prefix` is used to create isolated `storage` objects. Default: `"webext-pref/"`. For example:

```js
const pref = createPref({
  foo: "bar"
});
await pref.connect(createWebextStorage("local", "module-settings/"));
await pref.set("foo", "baz");

const pref2 = createPref({
  foo: "baz"
});
await pref2.connect(createWebextStorage("local", "extension-settings/"));
await pref2.set("foo", "bak");

console.log(pref.get("foo"), pref2.get("foo")); // "baz", "bak"

// `pref` and `pref2` both use `browser.storage.local` API but they have
// different prefix so "foo" is actually saved as "module-settings/global/foo"
// and "extension-settings/global/foo"
```

### createMemoryStorage

```js
createMemoryStorage() => MemoryStorage
```

This is used for testing only.

### Storage interface

By implementing this interface, the object can be used by `pref.connect`.

#### Storage.setMany

```js
async Storage.setMany(settings: Object<key: String, value: any>) => void
```

`settings` is a `key` -> `value` map. `value` could be primitive, array, or plain object.

#### Storage.getMany

```js
async Storage.getMany(keys: Array<String>) => settings: Object<key: String, value: any>
```

Retrieve previously saved values. If `key` doesn't exist in the storage, then `settings[key]` should be `undefined`.

#### Storage.deleteMany

```js
async Storage.deleteMany(keys: Array<String>) => void
```

Delete values from the storage. If `key` doesn't exist, it should be ignored.

#### Storage.on

```js
Storage.on("change", callback: Function) => void
```

Register an event listener.

The storage object should implement an event interface (`on` and `off`). It should emmit a "change" event when the value is changed.

Callback signature:

```js
(changes: Object<key: String, newValue: any>) => void
```

`changes` is `key` -> `newValue` object map that the value is changed. If the `key` is deleted, `newValue` is `undefined`.

> Note: `createWebextStorage` uses [`event-lite`](https://www.npmjs.com/package/event-lite).

#### Storage.off

```js
Storage.off("change", callback: Function) => void
```

Un-register the event listener.

Changelog
---------

* 0.6.0 (Dec 24, 2019)

  - **Breaking: drop `createView`.** UI related code has been moved to [webext-pref-ui](https://github.com/eight04/webext-pref-ui).
  - Add: `pref.has`.

* 0.5.2 (Dec 24, 2019)

  - Add: `ViewBodyItem.className`.
  - Add: use `Node` as `help` or `label`.

* 0.5.1 (Feb 18, 2019)

  - Fix: webextStorage doesn't report errors correctly in Chrome.

* 0.5.0 (Aug 24, 2018)

  - **Change: the shape of `Storage` is changed. Added `Storage.deleteMany`.**
  - Fix: scoped values are not deleted when deleting a scope.
  - Add: `prefix` arg in `createWebextStorage`.

* 0.4.1 (Aug 24, 2018)

  - Add: tooltip for nav controls.
  - Change: replace `x` with multiplication sign `×`.

* 0.4.0 (Aug 21, 2018)

  - **Drop: translate arg in `createView`.**
  - Add: `getMessage` arg in `createView`.
  - Add: `alert`, `confirm`, and `prompt` arg in `createView`.  

* 0.3.5 (Aug 20, 2018)

  - Fix: the initial value of the current scope is wrong.

* 0.3.4 (Aug 19, 2018)

  - Fix: failed to create view if some keys are missing in the body.
  - Fix: the number input returns string value in view.

* 0.3.3 (Aug 19, 2018)

  - Add: undefined key test in storage test suite.

* 0.3.2 (Aug 19, 2018)

  - Add: include storage test suite.

* 0.3.1 (Aug 17, 2018)

  - Fix: don't throw when the prompt is canceled.

* 0.3.0 (Aug 17, 2018)

  - Add: pref.import, pref.export.
  - Add: import/export buttons in createView.
  - Change: replace Storage.set with Storage.setMany.

* 0.2.0 (Aug 7, 2018)

  - More tests.
  - **Drop `parse`, `format` methods in view item**.
  - Add `validate` method in view item.

* 0.1.2 (Aug 5, 2018)

  - Adjust file tree for better code splitting.

* 0.1.1 (Aug 4, 2018)

  - Fix: missing index.js.

* 0.1.0 (Aug 4, 2018)

  - First release.
