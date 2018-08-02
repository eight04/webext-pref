/* eslint-env mocha */
const assert = require("assert");
const sinon = require("sinon");

const {createPref, createWebextStorage} = require("..");
const {createMemoryStorage} = require("./memory-storage");
const {createBrowserShim} = require("./browser-shim");

describe("pref", () => {
  it("default value", () => {
    const pref = createPref({foo: "foo"});
    assert.equal(pref.get("foo"), "foo");
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
  });
});

describe("storage", () => {
  it("set, get, changes", async () => {
    global.browser = createBrowserShim();
    const storage = createWebextStorage();
    await Promise.all([
      storage.set("foo", "bar"),
      storage.set("baz", "bak")
    ]);
    const result = await storage.getMany(["foo", "baz"]);
    assert.deepStrictEqual(result, {
      foo: "bar",
      baz: "bak"
    });
    const onChange = sinon.spy();
    storage.on("change", onChange);
    await storage.set("foo", "fan");
    assert.equal(onChange.callCount, 1);
    assert.deepStrictEqual(onChange.args[0][0], {foo: "fan"});
    delete global.browser;
  });
});
