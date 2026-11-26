/* ============ SETTINGS (T11) ============ */
/* PM.settings.get/set with defaults, persisted under pokemath_settings.
   Emits settings:change {key, value}. UI registers toggles via registerToggle. */
window.PM = window.PM || {};
(function(P){
  var DEFAULTS = {
    sound: true,
    voice: true,
    theme: "day",
    animations: true
  };
  var toggles = [];

  function has(obj, key){ return Object.prototype.hasOwnProperty.call(obj, key); }
  function stored(){
    var data = P.store ? P.store.get("settings", {}) : {};
    return (data && typeof data === "object") ? data : {};
  }
  function findToggle(key){
    for (var i = 0; i < toggles.length; i++){
      if (toggles[i].key === key) return toggles[i];
    }
    return null;
  }

  P.settings = {
    defaults: DEFAULTS,
    get: function(key){
      var data = stored();
      if (has(data, key)) return data[key];
      if (has(DEFAULTS, key)) return DEFAULTS[key];
      var toggle = findToggle(key);
      return toggle ? toggle["default"] : undefined;
    },
    set: function(key, value){
      var data = stored();
      data[key] = value;
      if (P.store) P.store.set("settings", data);
      if (P.emit) P.emit("settings:change", { key: key, value: value });
      return value;
    },
    registerToggle: function(toggle){
      if (!toggle || !toggle.key) return;
      if (!findToggle(toggle.key)) toggles.push(toggle);
    },
    list: function(){ return toggles.slice(); }
  };
})(window.PM);
