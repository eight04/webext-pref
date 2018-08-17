const EventEmitter = require("event-lite");

function createPref(DEFAULT, sep = "/") {
  let storage;
  let currentScope = "global";
  let scopeList = ["global"];
  const events = new EventEmitter;
  const globalCache = {};
  let scopedCache = {};
  let currentCache = Object.assign({}, DEFAULT);
  let initializing;
  
  return Object.assign(events, {
    storage,
    ready,
    connect,
    disconnect,
    get,
    getAll,
    set,
    getCurrentScope,
    setCurrentScope,
    addScope,
    deleteScope,
    getScopeList,
    import: import_,
    export: export_
  });
  
  function import_(input) {
    const newScopeList = input.scopeList || scopeList.slice();
    const scopes = new Set(newScopeList);
    if (!scopes.has("global")) {
      throw new Error("invalid scopeList");
    }
    const changes = {
      scopeList: newScopeList
    };
    for (const [scopeName, scope] of Object.entries(input.scopes)) {
      if (!scopes.has(scopeName)) {
        continue;
      }
      for (const [key, value] of Object.entries(scope)) {
        if (DEFAULT[key] == undefined) {
          continue;
        }
        changes[`${scopeName}${sep}${key}`] = value;
      }
    }
    return storage.setMany(changes);
  }
  
  function export_() {
    const keys = [];
    for (const scope of scopeList) {
      keys.push(...Object.keys(DEFAULT).map(k => `${scope}${sep}${k}`));
    }
    keys.push("scopeList");
    return storage.getMany(keys)
      .then(changes => {
        const _scopeList = changes.scopeList || scopeList.slice();
        const scopes = new Set(_scopeList);
        const output = {
          scopeList: _scopeList,
          scopes: {}
        };
        for (const [key, value] of Object.entries(changes)) {
          const sepIndex = key.indexOf(sep);
          if (sepIndex < 0) {
            continue;
          }
          const scope = key.slice(0, sepIndex);
          const realKey = key.slice(sepIndex + sep.length);
          if (!scopes.has(scope)) {
            continue;
          }
          if (DEFAULT[realKey] == undefined) {
            continue;
          }
          if (!output.scopes[scope]) {
            output.scopes[scope] = {};
          }
          output.scopes[scope][realKey] = value;
        }
        return output;
      });
  }
  
  function connect(_storage) {
    storage = _storage;
    initializing = storage.getMany(
      Object.keys(DEFAULT).map(k => `global${sep}${k}`).concat(["scopeList"])
    )
      .then(updateCache);
    storage.on("change", updateCache);
    return initializing;
  }
  
  function disconnect() {
    storage.off("change", updateCache);
    storage = null;
  }
  
  function updateCache(changes, rebuildCache = false) {
    if (changes.scopeList) {
      scopeList = changes.scopeList;
      events.emit("scopeListChange", scopeList);
      if (!scopeList.includes(currentScope)) {
        return setCurrentScope("global");
      }
    }
    const changedKeys = new Set;
    for (const [key, value] of Object.entries(changes)) {
      const [scope, realKey] = key.startsWith(`global${sep}`) ? ["global", key.slice(6 + sep.length)] :
        key.startsWith(`${currentScope}${sep}`) ? [currentScope, key.slice(currentScope.length + sep.length)] :
          [null, null];
      if (!scope || DEFAULT[realKey] == null) {
        continue;
      }
      if (scope === "global") {
        changedKeys.add(realKey);
        globalCache[realKey] = value;
      }
      if (scope === currentScope) {
        changedKeys.add(realKey);
        scopedCache[realKey] = value;
      }
    }
    if (rebuildCache) {
      Object.keys(DEFAULT).forEach(k => changedKeys.add(k));
    }
    const realChanges = {};
    let isChanged = false;
    for (const key of changedKeys) {
      const value = scopedCache[key] != null ? scopedCache[key] :
        globalCache[key] != null ? globalCache[key] :
        DEFAULT[key];
      if (currentCache[key] !== value) {
        realChanges[key] = value;
        currentCache[key] = value;
        isChanged = true;
      }
    }
    if (isChanged) {
      events.emit("change", realChanges);
    }
  }
  
  function ready() {
    return initializing;
  }
  
  function get(key) {
    return currentCache[key];
  }
  
  function getAll() {
    return Object.assign({}, currentCache);
  }
  
  function set(key, value) {
    return storage.setMany({
      [`${currentScope}${sep}${key}`]: value
    });
  }
  
  function getCurrentScope() {
    return currentScope;
  }
  
  function setCurrentScope(newScope) {
    if (currentScope === newScope) {
      return Promise.resolve(true);
    }
    if (!scopeList.includes(newScope)) {
      return Promise.resolve(false);
    }
    return storage.getMany(Object.keys(DEFAULT).map(k => `${newScope}${sep}${k}`))
      .then(changes => {
        currentScope = newScope;
        scopedCache = {};
        events.emit("scopeChange", currentScope);
        updateCache(changes, true);
        return true;
      });
  }
  
  function addScope(scope) {
    if (scopeList.includes(scope)) {
      return Promise.reject(new Error(`${scope} already exists`));
    }
    if (scope.includes(sep)) {
      return Promise.reject(new Error(`invalid word: ${sep}`));
    }
    return storage.setMany({
      scopeList: scopeList.concat([scope])
    });
  }
  
  function deleteScope(scope) {
    if (scope === "global") {
      return Promise.reject(new Error(`cannot delete global`));
    }
    return storage.setMany({
      scopeList: scopeList.filter(s => s != scope)
    });
  }
  
  function getScopeList() {
    return scopeList;
  }
}

module.exports = {createPref};
