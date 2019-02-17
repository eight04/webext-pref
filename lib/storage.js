/* global browser chrome */
const EventEmitter = require("event-lite");
const promisify = require("./promisify");

function createWebextStorage(area = "local", prefix = "webext-pref/") {
  const events = new EventEmitter;
  
  const ON_CHANGED = ["addListener", "removeListener"].reduce((output, key) => {
    output[key] = typeof browser === "object" ?
      browser.storage.onChanged[key].bind(browser.storage.onChanged) :
      chrome.storage.onChanged[key].bind(chrome.storage.onChanged);
    return output;
  }, {});
  
  const METHODS = ["get", "set", "remove"].reduce((output, key) => {
    output[key] = typeof browser === "object" ?
      browser.storage[area][key].bind(browser.storage[area]) : 
      promisify(chrome.storage[area][key].bind(chrome.storage[area]));
    return output;
  }, {});
  
  ON_CHANGED.addListener(onChange);
  
  return Object.assign(events, {getMany, setMany, deleteMany, destroy});
  
  function destroy() {
    ON_CHANGED.removeListener(onChange);
  }
  
  function getMany(keys) {
    return METHODS.get(keys.map(k => prefix + k))
      .then(changes => {
        const o = {};
        for (const [key, value] of Object.entries(changes)) {
          if (key.startsWith(prefix)) {
            o[key.slice(prefix.length)] = value;
          }
        }
        return o;
      });
  }
  
  function setMany(options) {
    const newOptions = {};
    for (const [key, value] of Object.entries(options)) {
      newOptions[prefix + key] = value;
    }
    return METHODS.set(newOptions);
  }
  
  function deleteMany(keys) {
    return METHODS.remove(keys.map(k => prefix + k));
  }
  
  function onChange(changes, _area) {
    if (_area !== area) {
      return;
    }
    const realChanges = {};
    for (const [key, {newValue}] of Object.entries(changes)) {
      if (key.startsWith(prefix)) {
        realChanges[key.slice(prefix.length)] = newValue;
      }
    }
    events.emit("change", realChanges);
  }
}

module.exports = {createWebextStorage};
