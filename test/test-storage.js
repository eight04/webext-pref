/* eslint-env mocha */
const assert = require("assert");
const sinon = require("sinon");

module.exports = ({createStorage, setup, cleanup}) => {
  describe("storage", () => {
    beforeEach(() => {
      if (setup) {
        setup();
      }
    });
    
    afterEach(() => {
      if (cleanup) {
        cleanup();
      }
    });
    
    it("set, get, changes", async () => {
      const storage = createStorage();
      let result;
      result = await storage.getMany(["foo", "baz"]);
      assert.equal(result.foo, undefined);
      assert.equal(result.baz, undefined);
      
      await storage.setMany({
        foo: "bar",
        baz: "bak"
      });
      result = await storage.getMany(["foo", "baz"]);
      assert.deepStrictEqual(result, {
        foo: "bar",
        baz: "bak"
      });
      
      await storage.deleteMany(["foo"]);
      result = await storage.getMany(["foo", "baz"]);
      assert.equal(result.foo, undefined);
      assert.equal(result.baz, "bak");
      
      const onChange = sinon.spy();
      storage.on("change", onChange);
      await storage.setMany({
        foo: "fan"
      });
      assert.equal(onChange.callCount, 1);
      assert.deepStrictEqual(onChange.lastCall.args[0], {foo: "fan"});
      await storage.deleteMany(["foo"]);
      assert.equal(onChange.callCount, 2);
      assert.deepStrictEqual(onChange.lastCall.args[0], {foo: undefined});
    });
  });
};
