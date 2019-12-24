const {createPref} = require("./lib/pref");
const {createWebextStorage, createMemoryStorage} = require("./lib/storage");

module.exports = {
  createPref,
  createWebextStorage,
  createMemoryStorage
};
