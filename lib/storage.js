/* global browser chrome */
const EventEmitter = require("event-lite");

function promisify(func) {
  return (...args) =>
    new Promise((resolve, reject) => {
      func(...args, (...results) => {
        if (chrome.runtime.error) {
          reject(chrome.runtime.error);
          return;
        }
        if (results.length <= 1) {
          resolve(results[0]);
          return;
        }
        resolve(results);
      });
    });
}

function createWebextStorage(area = "local") {
  const events = new EventEmitter;
  const addListener = typeof browser === "object" ?
    browser.storage.onChanged.addListener.bind(browser.storage.onChanged) :
    chrome.storage.onChanged.addListener.bind(chrome.storage.onChanged);
  const removeListener = typeof browser === "object" ?
    browser.storage.onChanged.removeListener.bind(browser.storage.onChanged) :
    chrome.storage.onChanged.removeListener.bind(chrome.storage.onChanged);
  const storageGet = typeof browser === "object" ?
    browser.storage[area].get.bind(browser.storage[area]) : 
    promisify(chrome.storage[area].get.bind(chrome.storage[area]));
  const storageSet = typeof browser === "object" ?
    browser.storage[area].set.bind(browser.storage[area]) :
    promisify(chrome.storage[area].set.bind(chrome.storage[area]));
  addListener(onChange);
  return Object.assign(events, {getMany, setMany, destroy});
  
  function destroy() {
    removeListener(onChange);
  }
  
  function getMany(keys) {
    return storageGet(keys.map(k => `webext-pref/${k}`))
      .then(changes => {
        const o = {};
        for (const [key, value] of Object.entries(changes)) {
          if (key.startsWith("webext-pref/")) {
            o[key.slice(12)] = value;
          }
        }
        return o;
      });
  }
  
  function setMany(options) {
    const newOptions = {};
    for (const [key, value] of Object.entries(options)) {
      newOptions[`webext-pref/${key}`] = value;
    }
    return storageSet(newOptions);
  }
  
  function onChange(changes, _area) {
    if (_area !== area) {
      return;
    }
    const realChanges = {};
    for (const [key, {newValue}] of Object.entries(changes)) {
      if (key.startsWith("webext-pref/")) {
        realChanges[key.slice(12)] = newValue;
      }
    }
    events.emit("change", realChanges);
  }
}

module.exports = {createWebextStorage};
