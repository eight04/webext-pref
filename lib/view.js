function buildView({root, pref, body, translate}) {
  const nav = createNav();
  const form = createForm(body);
  
  root.append(nav.frag, form.frag);
  
  pref.on("scopeChange", nav.updateScope);
  nav.updateScope(pref.getCurrentScope());
  
  pref.on("scopeListChange", nav.updateScopeList);
  nav.updateScopeList(pref.getScopeList());
  
  pref.on("change", form.updateInputs);
  form.updateInputs(pref.getAll());
  
  return destroy;
  
  function destroy() {
    root.innerHTML = "";
    pref.off("scopeChange", nav.updateScope);
    pref.off("scopeListChange", nav.updateScopeList);
    pref.off("change", form.updateInputs);
  }
  
  function createForm(body) {
    const _body = createBody({body});
    return Object.assign(_body, updateInputs);
    
    function updateInputs(changes) {
      for (const [key, value] of Object.entries(changes)) {
        _body.inputs[key].setValue(value);
      }
    }
  }
  
  function createNav() {
    const select = document.createElement("select");
    
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.onclick = () => {
      pref.deleteScope(pref.getCurrentScope())
        .catch(err => {
          alert(err.message);
        });
    };
    
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "+";
    addButton.onclick = () => {
      addNewScope().catch(err => {
        alert(err.message);
      });
        
      function addNewScope() {
        const scopeName = prompt(translate.inputNewScopeName).trim();
        if (!scopeName) {
          return Promise.reject(new Error("the value is empty"));
        }
        return pref.addScope(scopeName)
          .then(() => pref.setCurrentScope(scopeName));
      }
    };
    
    return {
      select,
      updateScope,
      updateScopeList,
      frag: [
        select,
        deleteButton,
        addButton
      ]
    };
    
    function updateScope(newScope) {
      select.value = newScope;
    }
    
    function updateScopeList(scopeList) {
      select.innerHTML = "";
      select.append(...scopeList.map(scope => {
        const option = document.createElement("option");
        option.value = scope;
        option.textContent = scope;
      }));
    }
  }
  
  function createBody({body, hLevel = 3}) {
    if (!body) {
      return [];
    }
    return body.map(el => {
      const container = document.createElement("div");
      container.className = `webext-pref-${el.type}`;
      Object.assign(
        el,
        el.type === "section" ? createSection({el, hLevel}) :
          el.type === "checkbox" ? createCheckbox(el) :
          el.type === "radiogroup" ? createRadioGroup(el) :
          createInput(el)
      );
      container.append(...el.frag);
      return container;
    });
  }
  
  function createSection({el, hLevel}) {
    const header = document.createElement(`h${hLevel}`);
    header.className = "webext-pref-header";
    header.textContent = el.label;
    
    return {
      frag: [
        header,
        el.help && createHelp(el.help),
        ...createBody({
          body: el.children,
          hLevel: hLevel + 1
        })
      ]
    };
  }
  
  function createCheckbox(el) {
    const input = document.createElement("input");
    input.id = `pref-${el.key}`;
    input.type = el.type;
    
    const box = document.createElement("div");
    box.className = "webext-pref-checkbox-box";
    
    box.append(createLabel(el.label, input.id));
    if (el.learnMore) {
      box.append(createLearnMore(el.learnMore));
    }
    if (el.help) {
      box.append(createHelp(el.help));
    }
    if (el.children && el.children.length) {
      box.append(createChildContainer(el.children));
    }
    
    return {
      input,
      frag: [
        input,
        box
      ]
    };
    
    function createChildContainer(children) {
      const container = document.createElement("fieldset");
      container.className = "webext-pref-checkbox-children";
      container.append(...createBody({body: children}));
      return container;
    }
  }
  
  function createRadioGroup(el) {
    const frag = [];
    
    const radios = el.options.map(option => {
      const container = document.createElement("div");
      container.className = "webext-pref-checkbox";
      
      const checkbox = createCheckbox(Object.assign({}, option, {
        key: `${el.key}-${option.value}`
      }));
      
      container.append(...checkbox.frag);
      return Object.assign(checkbox, {frag: container, key: option.value});
    });
    
    const radioMap = {};
    for (const radio of radios) {
      radioMap[radio.key] = radio;
    }
    
    if (el.label) {
      frag.push(createTitle(el.label));
    }
    if (el.learnMore) {
      frag.push(createLearnMore(el.learnMore));
    }
    if (el.help) {
      frag.push(createHelp(el.help));
    }
    frag.push(...radios.map(r => r.frag));
    
    return {
      radios: radioMap,
      frag
    };
    
    function createTitle(text) {
      const title = document.createElement("span");
      title.className = "webext-pref-radio-title";
      title.textContent = text;
      return title;
    }
  }
  
  function createInput(el) {
    const frag = [];
    let input;
    if (el.type === "select") {
      input = document.createElement("select");
      input.className = "browser-style";
      input.multiple = el.multiple;
      input.append(...Object.entries(input.options).map(([key, value]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = value;
      }));
    } else if (el.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = "8";
      input.className = "browser-style";
    } else {
      input = document.createElement("input");
      input.type = el.type;
    }
    input.id = `pref-${el.key}`;
    
    frag.push(createLabel(el.label, input.id));
    if (el.learnMore) {
      frag.push(createLearnMore(el.learnMore));
    }
    frag.push(input);
    if (el.help) {
      frag.push(createHelp(el.help));
    }
    
    return {
      input,
      frag
    };
  }
  
  function createHelp(text) {
    const help = document.createElement("div");
    help.className = "webext-pref-help";
    help.textContent = text;
    return help;
  }
  
  function createLabel(text, id) {
    const label = document.createElement("label");
    label.textContent = text;
    label.for = id;
    return label;
  }
  
  function createLearnMore(url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = translate.learnMore;
    return a;
  }
}

function createView({pref, body, translate}) {
  return {build: root => buildView({root, pref, body, translate})};
}

module.exports = {createView};
