/**
 * PM FOUNDATION SHIM (PM-00 subset)
 * PM-04 depends on the PM-00 foundation (event bus, settings, storage).
 */
var PM = window.PM = window.PM || {};
(function(){
  var P = window.PM;

  /* ========== PM-18: iOS Adaptive UI Initialization ========== */
  function initPM18Adapt() {
    // Initialize safe area handling if param exists
    var params = new URLSearchParams(location.search);
    var safeArea = parseInt(params.get('safe') || '0,0,0,0');

    if (safeArea && !window.pokemathSafeHandled) {
      pokemathSafeArea = safeArea;
      window.pokemathSafeHandled = true;

      // Update CSS variables for top bar position
      document.documentElement.style.setProperty('--safe-area-top', safeArea + 'px');
      document.body.classList.add('home-screen-app');
    }
  }

  /* ========== Event bus (PM-00 R3) ========== */
  if (!P.on) {
    var handlers = {};
    P.on = function(event, fn) {
      if (typeof fn !== "function") return fn;
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(fn);
      return fn;
    };
    P.off = function(event, fn) {
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

    // Register sound setting
    P.settings.registerToggle({
      key: "sound",
      label: "🔊 Звук",
      "default": true
    });

    // Register iOS screenshot setting (PM-18)
    P.settings.registerToggle({
      key: "ios-screenshot-enabled",
      label: "📱 Сніmare екрану (iOS)",
      "default": false
    });
  }

  /* ---------- Minimal Settings UI ========== */
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
      g.textContent = "📝";
      g.setAttribute("aria-label", "Налаштування / Screenshot settings");
      g.onclick = openSettings;
      var themeBtn = document.getElementById("gameThemeBtn");
      if (themeBtn && themeBtn.parentNode === topbar) topbar.insertBefore(g, themeBtn);
      else topbar.appendChild(g);
    }
  }

  if (document.body) addGear();
  else document.addEventListener("DOMContentLoaded", addGear);

  /* ========== PM-18: Safe Area Support Handlers ========== */
  var pokemathSafeArea = null;

  function applySafeAreaAdjustments() {
    if (!document.getElementById('gameTopbar')) return;

    var topbar = document.getElementById('gameTopbar');
    var safe = typeof pokemathSafeArea === 'object' ? pokemathSafeArea : null;

    if (safe && safe.top) {
      // Set CSS custom properties for safe area
      document.documentElement.style.setProperty('--safe-area-top', safe.top + 'px');
      document.body.classList.add('safe-area-applied');

      // Adjust topbar margin to accommodate iOS safe area
      var gap = parseFloat(getComputedStyle(topbar).gap) || 8;
      var marginTopAdjustment = (safe.top / 2) + 10;
      topbar.style.marginTop = '-(' + (marginTopAdjustment > 0 ? marginTopAdjustment : 0) + ')px';
      topbar.style.paddingTop = 'max(' + gap / 2 + ', ' + (marginTopAdjustment / 2) + ')px';

      // Prevent overflow in safe areas
      if (safe.left || safe.right) {
        document.body.style.overflow = 'auto';
      } else {
        document.body.style.overflow = 'hidden';
      }
    }
  }

  /* Handle Home Screen app params */
  if (typeof pokemathSafeArea === 'string' && pokemathSafeArea.length) {
    // Parse the safe area parameter (format: "top,left,bottom,right")
    var parts = pokemathSafeArea.split(',');
    pokemathSafeArea = {
      top: parseInt(parts[0] || '0'),
      left: parseInt(parts[1] || '0'),
      bottom: parseInt(parts[2] || '0'),
      right: parseInt(parts[3] || '0')
    };
    
    // Update CSS variables for all safe areas
    document.documentElement.style.setProperty('--safe-area-top', pokemathSafeArea.top + 'px');
    document.documentElement.style.setProperty('--safe-area-left', pokemathSafeArea.left + 'px');
    document.documentElement.style.setProperty('--safe-area-right', pokemathSafeArea.right + 'px');

    // Apply adjustments
    applySafeAreaAdjustments();
    document.body.classList.add('home-screen-app');
  } else {
    document.body.classList.add('home-screen-app');
  }

  /* ========== PM-18: Touch Prevention Settings ========== */
  function applyTouchSettings() {
    // User-select prevention (AC7)
    if (window.userSelectPrevented !== true) {
      document.documentElement.style.webkitUserSelect = 'none';
      document.documentElement.style.userSelect = 'none';
      
      // Prevent default tap highlights
      var touchables = document.querySelectorAll('button, input, select');
      touchables.forEach(function(el) {
        el.addEventListener('touchstart', function(e) {
          if (e.target.tagName !== 'BUTTON' && 
              e.target.tagName !== 'INPUT' && 
              e.target.tagName !== 'SELECT') {
            e.preventDefault();
          }
        }, { capture: true });
      });

      // Prevent zoom on double tap
      var elements = document.querySelectorAll('*');
      elements.forEach(function(el) {
        el.addEventListener('dblclick', function(e) {
          if (e.target.tagName !== 'IMG' && 
              !el.getAttribute('data-prevent-zoom')) {
            e.preventDefault();
            return false;
          }
        });
      });

      window.userSelectPrevented = true;
    }
  }

  /* ========== PM-18: Responsive Layout Detection ========== */
  function detectResponsiveLayout() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var vw = window.innerWidth || document.documentElement.clientWidth;

    // Return layout configuration based on viewport size
    if (vh < 320) {
      return { type: 'small', columns: 1 };
    } else if (vh >= 320 && vh < 430) {
      return { type: 'medium', columns: 2 };
    } else {
      return { type: 'large', columns: 4 };
    }
  }

  /* Apply responsive layout based on viewport */
  function applyResponsiveLayout() {
    var layout = detectResponsiveLayout();
    document.body.style.responsiveLayout = JSON.stringify(layout);

    // Update game container if exists
    var gameContainer = document.querySelector('.game-container');
    var keypad = document.querySelector('.keypad');

    if (layout.columns === 2 && gameContainer) {
      gameContainer.classList.add('two-column-layout');
    }
  }

  /* Initialize on DOM ready */
  if (document.body) {
    applyResponsiveLayout();
    applyTouchSettings();
  } else {
    document.addEventListener("DOMContentLoaded", function() {
      applyResponsiveLayout();
      applyTouchSettings();
    });
  }

})();
