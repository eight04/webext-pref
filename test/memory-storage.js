const EventEmitter = require("event-lite");

function createMemoryStorage() {
  const storage = new Map;
  const events = new EventEmitter;
  return Object.assign(events, {getMany, set});
  
  function getMany(keys) {
    const changes = {};
    for (const key of keys) {
      if (storage.has(key)) {
        changes[key] = storage.get(key);
      }
    }
    return Promise.resolve(changes);
  }
  
  function set(key, value) {
    storage.set(key, value);
    events.emit("change", {[key]: value});
    return Promise.resolve();
  }
}

module.exports = {createMemoryStorage};
