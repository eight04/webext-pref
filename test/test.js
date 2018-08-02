/* eslint-env mocha */
const assert = require("assert");
const {createPref} = require("..");
const {createMemoryStorage} = require("./memory-storage");

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
    debugger;
    await pref.setCurrentScope("global");
    assert.equal(pref.get("foo"), "foo");
  });
});
