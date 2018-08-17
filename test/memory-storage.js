const EventEmitter = require("event-lite");

function createMemoryStorage() {
  const storage = new Map;
  const events = new EventEmitter;
  return Object.assign(events, {getMany, setMany});
  
  function getMany(keys) {
    const changes = {};
    for (const key of keys) {
      if (storage.has(key)) {
        changes[key] = storage.get(key);
      }
    }
    return Promise.resolve(changes);
  }
  
  function setMany(values) {
    for (const [key, value] of Object.entries(values)) {
      storage.set(key, value);
    }
    events.emit("change", values);
    return Promise.resolve();
  }
}

module.exports = {createMemoryStorage};
