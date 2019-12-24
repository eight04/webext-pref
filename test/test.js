/* eslint-env mocha */
const assert = require("assert");

const {createPref, createWebextStorage, createMemoryStorage} = require("..");
const promisify = require("../lib/promisify");

const {createBrowserShim} = require("./browser-shim");
const testStorage = require("./test-storage.js");

describe("pref", () => {
  it("default value", () => {
    const pref = createPref({foo: "foo"});
    assert.equal(pref.get("foo"), "foo");
    assert.equal(pref.has("foo"), true);
    assert.equal(pref.has("bar"), false);
  });
  
  it("share values in the storage", async () => {
    const storage = createMemoryStorage();
    const pref = createPref({foo: "foo"});
    const pref2 = createPref({foo: "foo"});
    await Promise.all([
      pref.connect(storage),
      pref2.connect(storage)
    ]);
    await pref.set("foo", "bar");
    assert.equal(pref.get("foo"), "bar");
    assert.equal(pref2.get("foo"), "bar");
  });
  
  it("scoped values", async () => {
    const pref = createPref({foo: "foo"});
    await pref.connect(createMemoryStorage());
    
    assert.equal(await pref.setCurrentScope("test1"), false);
    await pref.addScope("test1");
    assert.equal(await pref.setCurrentScope("test1"), true);
    
    await pref.set("foo", "bar");
    assert.equal(pref.get("foo"), "bar");
    
    await pref.setCurrentScope("global");
    assert.equal(pref.get("foo"), "foo");
    
    await pref.setCurrentScope("test1");
    assert.equal(pref.get("foo"), "bar");
    
    await pref.deleteScope("test1");
    assert.equal(pref.get("foo"), "foo");
    
    await pref.addScope("test1");
    await pref.setCurrentScope("test1");
    assert.equal(pref.get("foo"), "foo");
  });
  
  it("addScope error", async () => {
    const pref = createPref({foo: "foo"});
    await pref.connect(createMemoryStorage());
    await assert.rejects(pref.addScope("global"), /already exists/);
    await assert.rejects(pref.addScope("in/valid"), /invalid word: \//);
  });
  
  it("import, export", async () => {
    const pref = createPref({foo: "foo"});
    await pref.connect(createMemoryStorage());
    await pref.set("foo", "bar");
    await pref.addScope("test");
    await pref.setCurrentScope("test");
    await pref.set("foo", "baz");
    const settings = await pref.export();
    
    const pref2 = createPref({foo: "foo"}, "$/$");
    await pref2.connect(createMemoryStorage());
    assert.equal(pref2.get("foo"), "foo");
    await pref2.import(settings);
    assert.equal(pref2.get("foo"), "bar");
    await pref2.setCurrentScope("test");
    assert.equal(pref2.get("foo"), "baz");
  });
});

testStorage({
  createStorage: createWebextStorage,
  setup() {
    global.browser = createBrowserShim();
  },
  cleanup() {
    delete global.browser;
  }
});

testStorage({
  createStorage: createMemoryStorage
});

describe("promisify", () => {
  beforeEach(() => {
    global.chrome = {runtime: {}};
  });
  
  afterEach(() => {
    delete global.chrome;
  });
  
  it("success with one arg", async () => {
    function apiCall(arg, cb) {
      global.chrome.runtime.lastError = null;
      cb(arg);
    }
    const asyncAPICall = promisify(apiCall);
    assert.equal(await asyncAPICall("foo"), "foo");
  });
  
  it("success with multiple arg", async () => {
    function apiCall(arg, cb) {
      global.chrome.runtime.lastError = null;
      cb(arg[0], arg[1], arg[2]);
    }
    const asyncAPICall = promisify(apiCall);
    assert.deepStrictEqual(await asyncAPICall("foo"), ["f", "o", "o"]);
  });
  
  it("error", async () => {
    function apiCall(arg, cb) {
      global.chrome.runtime.lastError = new Error(`my error: ${arg}`);
      cb();
    }
    const asyncAPICall = promisify(apiCall);
    await assert.rejects(asyncAPICall("foo"), /my error: foo/);
  });
});
