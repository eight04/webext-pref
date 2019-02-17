/* eslint-env mocha */
const assert = require("assert");

const sinon = require("sinon");
const jsdomGlobal = require("jsdom-global");

const {createPref, createWebextStorage, createView} = require("..");
const {createMemoryStorage} = require("./memory-storage");
const {createBrowserShim} = require("./browser-shim");

const testStorage = require("./test-storage.js");

function delay(timeout = 0) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

describe("pref", () => {
  it("default value", () => {
    const pref = createPref({foo: "foo"});
    assert.equal(pref.get("foo"), "foo");
  });
  
  it("share values in the storage", async () => {
    const storage = createMemoryStorage();
    const pref = createPref({foo: "foo"});
    const pref2 = createPref({foo: "foo"});
    await Promise.all([
      pref.connect(storage),
      pref2.connect(storage)
    ]);
    await pref.set("foo", "bar");
    assert.equal(pref.get("foo"), "bar");
    assert.equal(pref2.get("foo"), "bar");
  });
  
  it("scoped values", async () => {
    const pref = createPref({foo: "foo"});
    await pref.connect(createMemoryStorage());
    
    assert.equal(await pref.setCurrentScope("test1"), false);
    await pref.addScope("test1");
    assert.equal(await pref.setCurrentScope("test1"), true);
    
    await pref.set("foo", "bar");
    assert.equal(pref.get("foo"), "bar");
    
    await pref.setCurrentScope("global");
    assert.equal(pref.get("foo"), "foo");
    
    await pref.setCurrentScope("test1");
    assert.equal(pref.get("foo"), "bar");
    
    await pref.deleteScope("test1");
    assert.equal(pref.get("foo"), "foo");
    
    await pref.addScope("test1");
    await pref.setCurrentScope("test1");
    assert.equal(pref.get("foo"), "foo");
  });
  
  it("addScope error", async () => {
    const pref = createPref({foo: "foo"});
    await pref.connect(createMemoryStorage());
    await assert.rejects(pref.addScope("global"), /already exists/);
    await assert.rejects(pref.addScope("in/valid"), /invalid word: \//);
  });
  
  it("import, export", async () => {
    const pref = createPref({foo: "foo"});
    await pref.connect(createMemoryStorage());
    await pref.set("foo", "bar");
    await pref.addScope("test");
    await pref.setCurrentScope("test");
    await pref.set("foo", "baz");
    const settings = await pref.export();
    
    const pref2 = createPref({foo: "foo"}, "$/$");
    await pref2.connect(createMemoryStorage());
    assert.equal(pref2.get("foo"), "foo");
    await pref2.import(settings);
    assert.equal(pref2.get("foo"), "bar");
    await pref2.setCurrentScope("test");
    assert.equal(pref2.get("foo"), "baz");
  });
});

testStorage({
  createStorage: createWebextStorage,
  setup() {
    global.browser = createBrowserShim();
  },
  cleanup() {
    delete global.browser;
  }
});

describe("view", () => {
  let cleanup;
  
  beforeEach(function () {
    this.timeout(40000);
    cleanup = jsdomGlobal();
  });
  
  afterEach(() => {
    cleanup();
    cleanup = null;
  });
  
  it("sync with pref", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    assert.equal(document.querySelector("input").value, "bar");
    await pref.set("foo", "baz");
    assert.equal(document.querySelector("input").value, "baz");
    await pref.addScope("test1");
    await pref.setCurrentScope("test1");
    await pref.set("foo", "bak");
    assert.equal(document.querySelector("input").value, "bak");
    await pref.deleteScope("test1");
    assert.equal(document.querySelector("input").value, "baz");
  });
  
  it("destroy", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    
    assert(!pref.listeners);
    
    const destroy = createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    assert(pref.listeners.change.length);
    assert(pref.listeners.scopeChange.length);
    assert(pref.listeners.scopeListChange.length);
    
    destroy();
    
    assert(!pref.listeners);
  });
  
  it("import, export", async () => {
    let promptResult;
    global.prompt = sinon.spy(() => promptResult);
    
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    await pref.set("foo", "bar");
    const exportButton = document.querySelector(".webext-pref-export");
    exportButton.click();
    await delay();
    const exported = global.prompt.lastCall.args[1];
    assert.deepStrictEqual(JSON.parse(exported), {
      scopeList: ["global"],
      scopes: {
        global: {
          foo: "bar"
        }
      }
    });
    
    const importButton = document.querySelector(".webext-pref-import");
    promptResult = JSON.stringify({
      scopes: {
        global: {
          foo: "baz"
        }
      }
    });
    importButton.click();
    await delay();
    assert.equal(pref.get("foo"), "baz");
    
    delete global.prompt;
  });
  
  it("with scope", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    await pref.addScope("test");
    await pref.setCurrentScope("test");
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    const select = document.querySelector(".webext-pref-nav select");
    assert.equal(select.value, "test");
  });
  
  it("add scope, delete scope", async () => {
    let promptResult;
    let confirmResult;
    global.prompt = sinon.spy(() => promptResult);
    global.confirm = sinon.spy(() => confirmResult);
    
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    const addButton = document.querySelector(".webext-pref-add-scope");
    const deleteButton = document.querySelector(".webext-pref-delete-scope");
    promptResult = "foo";
    addButton.click();
    promptResult = "bar";
    addButton.click();
    
    await delay();
    assert.deepStrictEqual(pref.getScopeList(), ["global", "foo", "bar"]);
    
    confirmResult = true;
    deleteButton.click();
    await delay();
    assert.deepStrictEqual(pref.getScopeList(), ["global", "foo"]);
    
    confirmResult = false;
    deleteButton.click();
    await delay();
    assert.deepStrictEqual(pref.getScopeList(), ["global", "foo"]);
    
    delete global.prompt;
    delete global.confirm;
  });
  
  it("getMessage", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ],
      getMessage: key => {
        if (key === "importButton") {
          return "foo";
        }
      }
    });
    
    const button = document.querySelector(".webext-pref-import");
    assert.equal(button.textContent, "foo");
  });
  
  it("getNewScope", async () => {
    const prompt = sinon.spy(async () => {});
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ],
      getNewScope: () => "foo",
      prompt
    });
    
    const button = document.querySelector(".webext-pref-add-scope");
    button.click();
    await delay();
    assert.equal(prompt.lastCall.args[1], "foo");
  });
  
  it("change scope", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    await pref.addScope("test1");
    const select = document.querySelector(".webext-pref-nav select");
    select.value = "test1";
    select.dispatchEvent(new Event("change"));
    await delay();
    assert.equal(pref.getCurrentScope(), "test1");
  });
  
  it("empty body", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: []
    });
  });
  
  it("section", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          type: "section",
          label: "Set value for foo",
          children: [
            {
              key: "foo",
              type: "text",
              label: "label of foo"
            }
          ]
        }
      ]
    });
    
    assert.equal(document.querySelector(".webext-pref-body").innerHTML, `<div class="webext-pref-section browser-style"><h3 class="webext-pref-header">Set value for foo</h3><div class="webext-pref-text browser-style"><label for="pref-foo">label of foo</label><input type="text" id="pref-foo"></div></div>`);
  });
  
  it("checkbox", async () => {
    const pref = createPref({foo: true});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "checkbox",
          label: "foo label",
        }
      ]
    });
    const input = document.querySelector("input");
    assert(input.checked);
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    await delay();
    assert(!pref.get("foo"));
  });
  
  it("checkbox children", async () => {
    const pref = createPref({foo: true, bar: false});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "checkbox",
          label: "foo label",
          children: [
            {
              key: "bar",
              type: "checkbox",
              label: "bar label"
            }
          ]
        }
      ]
    });
    assert(!document.querySelector("fieldset").disabled);
    await pref.set("foo", false);
    assert(document.querySelector("fieldset").disabled);
  });
  
  it("radiogroup", async () => {
    const pref = createPref({gender: "male"});
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "gender",
          type: "radiogroup",
          label: "gender label",
          children: [
            {
              type: "radio",
              label: "♂",
              value: "male"
            },
            {
              type: "radio",
              label: "♀",
              value: "female"
            }
          ]
        }
      ]
    });
    const radios = document.querySelectorAll("input");
    
    assert.equal(radios[0].name, "pref-gender");
    assert.equal(radios[1].name, "pref-gender");
    
    assert(radios[0].checked);
    assert(!radios[1].checked);
    
    assert.equal(pref.get("gender"), "male");
    
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event("change"));
    
    await delay();
    
    assert.equal(pref.get("gender"), "female");
    
    assert(!radios[0].checked);
    assert(radios[1].checked);
  });
  
  it("radiogroup children", async () => {
    const pref = createPref({
      gender: "male",
      maleOnly: "foo",
      femaleOnly: "bar"
    });
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "gender",
          type: "radiogroup",
          label: "gender label",
          children: [
            {
              type: "radio",
              label: "♂",
              value: "male",
              children: [
                {
                  key: "maleOnly",
                  type: "text",
                  label: "male only"
                }
              ]
            },
            {
              type: "radio",
              label: "♀",
              value: "female",
              children: [
                {
                  key: "femaleOnly",
                  type: "text",
                  label: "female only"
                }
              ]
            }
          ]
        }
      ]
    });
    const fieldsets = document.querySelectorAll("fieldset");
    assert(!fieldsets[0].disabled);
    assert(fieldsets[1].disabled);
    await pref.set("gender", "female");
    assert(fieldsets[0].disabled);
    assert(!fieldsets[1].disabled);
  });
  
  it("select", async () => {
    const pref = createPref({
      foo: "foo"
    });
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "select",
          label: "select foo",
          options: {
            foo: "I am foo",
            bar: "You are bar",
            baz: "He is baz"
          }
        }
      ]
    });
    const input = document.querySelector(".webext-pref-body select");
    assert.equal(input.value, "foo");
    input.value = "bar";
    input.dispatchEvent(new Event("change"));
    await delay();
    assert.equal(input.selectedOptions[0].textContent, "You are bar");
    assert.equal(pref.get("foo"), "bar");
  });
  
  it("select multiple", async () => {
    const pref = createPref({
      foo: ["foo"]
    });
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "select",
          label: "select foo",
          multiple: true,
          options: {
            foo: "I am foo",
            bar: "You are bar",
            baz: "He is baz"
          }
        }
      ]
    });
    const input = document.querySelector(".webext-pref-body select");
    assert.deepStrictEqual([...input.selectedOptions].map(o => o.value), ["foo"]);
    input.options[2].selected = true;
    input.dispatchEvent(new Event("change"));
    await delay();
    assert.deepStrictEqual(pref.get("foo"), ["foo", "baz"]);
  });
  
  it("textarea", async () => {
    const pref = createPref({
      foo: "foo\nbar"
    });
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "textarea",
          label: "foo label"
        }
      ]
    });
    const input = document.querySelector("textarea");
    assert.equal(input.nodeName, "TEXTAREA");
    assert.equal(input.value, "foo\nbar");
  });
  
  it("number", async () => {
    const pref = createPref({
      foo: 5
    });
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "number",
          label: "foo label"
        }
      ]
    });
    const input = document.querySelector("input");
    input.value = "7";
    input.dispatchEvent(new Event("change"));
    assert.strictEqual(pref.get("foo"), 7);
  });
  
  it("validate", async () => {
    const pref = createPref({
      foo: "123"
    });
    await pref.connect(createMemoryStorage());
    createView({
      pref,
      root: document.body,
      body: [
        {
          key: "foo",
          type: "text",
          label: "foo label",
          validate: value => {
            if (/\D/.test(value)) {
              throw new Error("only numbers are allowed");
            }
          }
        }
      ]
    });
    const input = document.querySelector("input");
    assert(input.validity.valid);
    input.value = "foo";
    input.dispatchEvent(new Event("change"));
    assert(!input.validity.valid);
    assert.equal(input.validationMessage, "only numbers are allowed");
    await delay();
    assert.equal(pref.get("foo"), "123");
    input.value = "456";
    input.dispatchEvent(new Event("change"));
    assert(input.validity.valid);
    await delay();
    assert.equal(pref.get("foo"), "456");
  });
  
});

describe("promisify", () => {
  beforeEach(() => {
    global.chrome = {runtime: {}};
  });
  
  afterEach(() => {
    delete global.chrome;
  });
  
  it("error", async () => {
    const promisify = require("../lib/promisify");
    function apiCall(arg, cb) {
      global.chrome.runtime.lastError = new Error(`my error: ${arg}`);
      cb();
    }
    const asyncAPICall = promisify(apiCall);
    await assert.rejects(asyncAPICall("foo"), /my error: foo/);
  });
});
