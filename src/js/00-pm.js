/* ============ PM FOUNDATION SHIM (PM-00 subset) ============
   PM-04 depends on the PM-00 foundation (event bus, settings, storage).
   Those files are not present in this checkout, so this small, additive
   shim provides exactly the pieces PM-04 needs. It only defines methods
   that are still missing, so a real PM-00 implementation can replace or
   extend it without conflicts. */
var PM = window.PM = window.PM || {};
(function(){
  var P = window.PM;

  /* ---------- Event bus (PM-00 R3) ---------- */
  if (!P.on){
    var handlers = {};
    P.on = function(event, fn){
      if (typeof fn !== "function") return fn;
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(fn);
      return fn;
    };
    P.off = function(event, fn){
      var list = handlers[event];
      if (!list) return;
      for (var i=0;i<list.length;i++){
        if (list[i] === fn){ list.splice(i, 1); return; }
      }
    };
    P.emit = function(event, payload){
      var list = handlers[event];
      if (!list) return;
      var copy = list.slice();
      for (var i=0;i<copy.length;i++){
        try { copy[i](payload || {}); }
        catch(e){
          if (window.console && console.error) console.error("PM handler error [" + event + "]", e);
        }
      }
    };
  }

  /* ---------- Storage (PM-00 R8 subset) ---------- */
  if (!P.store){
    var memory = {};
    var KEY_PREFIX = "pokemath_";
    function readRaw(key){
      try {
        var v = localStorage.getItem(KEY_PREFIX + key);
        return v === null ? undefined : v;
      } catch(e){
        return memory.hasOwnProperty(key) ? memory[key] : undefined;
      }
    }
    P.store = {
      get: function(key, def){
        var raw = readRaw(key);
        if (raw === undefined) return def;
        try { return JSON.parse(raw); }
        catch(e){ return def; }
      },
      set: function(key, value){
        var raw = JSON.stringify(value);
        memory[key] = raw;
        try { localStorage.setItem(KEY_PREFIX + key, raw); } catch(e){}
      },
      remove: function(key){
        delete memory[key];
        try { localStorage.removeItem(KEY_PREFIX + key); } catch(e){}
      },
      progressKey: function(mode, level){ return "pokemath_l" + level; }
    };
  }

  /* ---------- Settings (PM-00 R9 subset) ---------- */
  if (!P.settings){
    var toggles = {};
    var order = [];
    function settingsData(){
      var data = P.store.get("settings", {});
      return (data && typeof data === "object") ? data : {};
    }
    function findToggle(key){
      for (var i=0;i<order.length;i++){ if (order[i].key === key) return order[i]; }
      return null;
    }
    var S = {
      registerToggle: function(t){
        if (!t || !t.key) return;
        if (!findToggle(t.key)) order.push(t);
        toggles[t.key] = t;
        renderSettings();
      },
      get: function(key){
        var data = settingsData();
        if (data.hasOwnProperty(key)) return data[key];
        var t = toggles[key];
        return t ? t["default"] : undefined;
      },
      set: function(key, value){
        var data = settingsData();
        data[key] = value;
        P.store.set("settings", data);
        if (P.emit) P.emit("settings:changed", { key: key, value: value });
        updateCheckboxes();
      }
    };
    P.settings = S;
  }

  /* ---------- Minimal Settings UI ----------
     PM-00 owns the final Settings modal. This shim renders registered
     toggles so the sound switch is reachable in the real game. */
  var overlay = null, listEl = null;

  function ensureUI(){
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "pmSettingsOverlay";

    var modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Налаштування");

    var body = document.createElement("div");
    body.className = "modal-body";
    var title = document.createElement("h2");
    title.textContent = "⚙️ Налаштування";
    body.appendChild(title);

    listEl = document.createElement("div");
    listEl.id = "pmSettingsList";
    body.appendChild(listEl);
    modal.appendChild(body);

    var actions = document.createElement("div");
    actions.className = "row modal-actions";
    var done = document.createElement("button");
    done.className = "btn green";
    done.textContent = "Готово";
    done.onclick = closeSettings;
    actions.appendChild(done);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var style = document.createElement("style");
    style.textContent =
      "#pmSettingsList { text-align: left; margin: 12px 0; }" +
      ".pm-setting-row { display: flex; align-items: center; justify-content: space-between;" +
      " gap: 14px; padding: 10px 0; min-height: 48px; font-size: 22px; }" +
      ".pm-setting-row input { width: 28px; height: 28px; }";
    document.head.appendChild(style);
  }

  function renderSettings(){
    if (!document.body) return;
    ensureUI();
    listEl.innerHTML = "";
    var S = P.settings;
    if (!S || !S.registerToggle) return;
    for (var i=0;i<order.length;i++){
      (function(t){
        var row = document.createElement("label");
        row.className = "pm-setting-row";
        var span = document.createElement("span");
        span.textContent = t.label || t.key;
        var input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("data-setting-key", t.key);
        input.checked = S.get(t.key) !== false;
        input.onchange = function(){ S.set(t.key, input.checked); };
        row.appendChild(span);
        row.appendChild(input);
        listEl.appendChild(row);
      })(order[i]);
    }
  }

  function updateCheckboxes(){
    if (!listEl) return;
    var inputs = listEl.querySelectorAll("input[data-setting-key]");
    for (var i=0;i<inputs.length;i++){
      var key = inputs[i].getAttribute("data-setting-key");
      inputs[i].checked = P.settings.get(key) !== false;
    }
  }

  function openSettings(){
    ensureUI();
    renderSettings();
    overlay.classList.add("active");
  }
  function closeSettings(){
    if (overlay) overlay.classList.remove("active");
  }

  function addGear(){
    var menuRow = document.querySelector("#menu .menu-theme-row");
    if (menuRow && !document.getElementById("pmSettingsBtnMenu")){
      var b = document.createElement("button");
      b.id = "pmSettingsBtnMenu";
      b.className = "theme-toggle";
      b.textContent = "⚙️ Налаштування";
      b.onclick = openSettings;
      menuRow.appendChild(b);
    }
    var topbar = document.getElementById("gameTopbar");
    if (topbar && !document.getElementById("pmSettingsBtnGame")){
      var g = document.createElement("button");
      g.id = "pmSettingsBtnGame";
      g.className = "theme-toggle small";
      g.textContent = "⚙️";
      g.setAttribute("aria-label", "Налаштування");
      g.onclick = openSettings;
      var themeBtn = document.getElementById("gameThemeBtn");
      if (themeBtn && themeBtn.parentNode === topbar) topbar.insertBefore(g, themeBtn);
      else topbar.appendChild(g);
    }
  }

  if (document.body) addGear();
  else document.addEventListener("DOMContentLoaded", addGear);
})();
