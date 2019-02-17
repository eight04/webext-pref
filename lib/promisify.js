/* global chrome */
function promisify(func) {
  return (...args) =>
    new Promise((resolve, reject) => {
      func(...args, (...results) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
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

module.exports = promisify;
