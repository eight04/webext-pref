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

function createWebextStorage() {
  const events = new EventEmitter;
  const addListener = typeof browser === "object" ? browser.storage.addListener : chrome.storage.addListener;
  const storageGet = typeof browser === "object" ?
    browser.storage.local.get.bind(browser.storage.local) : 
    promisify(chrome.storage.local.get.bind(chrome.storage.local));
  const storageSet = typeof browser === "object" ?
    browser.storage.local.set.bind(browser.storage.local) :
    promisify(chrome.storage.local.set.bind(chrome.storage.local));
  addListener(onChange);
  return Object.assign(events, {getMany, set});
  
  function getMany(keys) {
    const o = {};
    for (const key of keys) {
      o[`webext-pref/${key}`] = null;
    }
    return storageGet(o)
      .then(changes => {
        const o = {};
        for (const [key, value] of Object.entries(changes)) {
          o[key.slice(12)] = JSON.parse(value);
        }
        return o;
      });
  }
  
  function set(key, value) {
    return storageSet({
      [`webext-pref/${key}`]: JSON.stringify(value)
    });
  }
  
  function onChange() {
    // todo
  }
}

module.exports = {createWebextStorage};
