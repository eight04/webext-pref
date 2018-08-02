const Events = require("event-lite");

function createBrowserShim() {
  const storage = new Map;
  const events = new Events;
  return {
    storage: {
      local: {
        get,
        set
      },
      onChanged: {
        addListener,
        removeListener
      }
    }
  };
  
  function get(keys) {
    const changes = {};
    for (const key of keys) {
      if (storage.has(key)) {
        changes[key] = storage.get(key);
      }
    }
    return Promise.resolve(changes);
  }
  
  function set(changes) {
    const realChanges = {};
    for (const [key, value] of Object.entries(changes)) {
      const oldValue = storage.get(key);
      if (oldValue !== value) {
        realChanges[key] = {
          oldValue,
          newValue: value
        };
        storage.set(key, value);
      }
    }
    events.emit("change", realChanges, "local");
    return Promise.resolve(realChanges);
  }
  
  function addListener(fn) {
    events.on("change", fn);
  }
  
  function removeListener(fn) {
    events.off("change", fn);
  }
}

module.exports = {createBrowserShim};
