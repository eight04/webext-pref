webext-pref
===========

[![Build Status](https://travis-ci.org/eight04/webext-pref.svg?branch=master)](https://travis-ci.org/eight04/webext-pref)
[![codecov](https://codecov.io/gh/eight04/webext-pref/branch/master/graph/badge.svg)](https://codecov.io/gh/eight04/webext-pref)

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
* `createView` - create a form builder.

### createPref

```js
const pref = createPref(defaults: Object, storage: Object);
```

Create a `pref` object.

* `defaults` - A map of `key` - `defaultValue` pairs.
* `storage` - You can create the storage object with `createGMStorage` or `createWebextStorage`.

#### pref.connect

```js
await pref.connect(storage);
```

Connect to a storage object then read the `global` settings into the pref object.

#### pref.disconnect

```js
pref.disconnect();
```

Disconnect from the storage object and unregister event listeners.

#### pref.setCurrentScope

```js
const success = await pref.setCurrentScope(scope: String);
```

Set the current scope and read the setting from the storage.

If the scope doesn't exist, the scope won't change and `success` will be `false`.

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

#### pref.getScopeList

```js
const scopes = pref.getScopeList();
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

#### pref.export

```js
const exported: Object = await pref.export();
```

Export all settings from the storage.

#### pref.import

```js
await pref.import(exported: Object);
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

* `change` - if the value of any key is changed. The callback would receive a `changes` object that is a `key` - `newValue` map.


### createWebextStorage

```js
const storage = createWebextStorage(area?: String);
```

Create a storage object using `browser.storage/chrome.storage` API.

`area` could be `"local"` or `"sync"`. Default: `"local"`.

### createView

```js
const destroyView = createView({
  pref: Object,
  body: Array<Object>,
  translate?: Object,
  root: Element,
  getNewScope?: () => newScopeName: String
});
```

Draw the options page on specified element.

`pref` is the pref object.

`body` is an array of object. Each item has following properties:

* `children?: Array` - a list of child items. Only available if `type` is `section`, `checkbox`, `radio`, or `radiogroup`. Note that child items of `radiogroup` must be `radio`s.
* `help?: String` - some help text for the item.
* `key: String` - the key of the pref value. Has no effect if `type` is `section` or `radio`.
* `label: String` - the label/title of the item.
* `learnMore?: String` - a URL that the "Learn more" link points to.
* `multiple?: Boolean` - only available if `type` is `select`. Default: `false`.
* `options: Object` - a value/label map, the options of `select` element. Only available if `type` is `select`.
* `type: String` - the type of the item. Possible values are `text`, `number`, `checkbox`, `textarea`, `radiogroup`, `radio`, `select`, `color`, or `section`.
* `validate?: value => null` - a validating function. To invalidate the input, throw an error that the message is the validation message. If nothing is thrown, the input is considered valid.

`translate` is a key/message map. It has following messages:

| message name | default text |
|-----|--------------|
|`inputNewScopeName`|`Add new scope`|
|`learnMore`|`Learn more`|
|`import`|`Import`|
|`export`|`Export`|
|`pasteSettings`|`Paste settings`|
|`copySettings`|`Copy settings`|

`root` is a HTML element.

`getNewScope` is a function returning a scope name. It would be used as the default value when the "Add new scope" prompt is shown. Default: `() => ""`.

When `destroyView` function is called, root element will be emptied and event listeners will be unbinded from the pref object.

#### Create sections

TBD

#### Create radio groups

TBD

### Storage interface

By implementing this interface, the object could be used by `pref.connect`.

#### Storage.setMany

```js
await Storage.setMany(settings: Object);
```

`settings` is a key/value map. `value` could be primitive, array, or plain object.

#### Storage.getMany

```js
const settings: Object = await Storage.getMany(keys: Array<String>);
```

Retrieve previously saved values. If `key` doesn't exist in the storage, then `settings[key]` should be `undefined`.

#### Storage.on

```js
Storage.on("change", (changes: Object) => {});
```

`changes` is key/value map that the value is changed.

Changelog
---------

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
