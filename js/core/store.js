/* ============ VERSIONED STORAGE (T10) ============ */
/* PM.store.get/set/remove use localStorage with an in-memory fallback.
   PM.progress.load/save own the per-grade profile keys.
   Schema 1: pokemath_l5 -> pokemath_profile_g0, pokemath_l7 -> pokemath_profile_g2
   (old keys are preserved). */
window.PM = window.PM || {};
(function(P){
  var PREFIX = "pokemath_";
  var SCHEMA = 1;
  var memory = {};

  function storage(){
    try { return window.localStorage || null; } catch (e) { return null; }
  }

  function readRaw(key){
    var full = PREFIX + key;
    var s = storage();
    if (s){
      try {
        var value = s.getItem(full);
        if (value !== null) return value;
      } catch (e) { /* fall through to memory */ }
    }
    return Object.prototype.hasOwnProperty.call(memory, full) ? memory[full] : undefined;
  }

  function writeRaw(key, raw){
    var full = PREFIX + key;
    memory[full] = raw;
    var s = storage();
    if (!s) return;
    try { s.setItem(full, raw); } catch (e) { /* memory keeps the value */ }
  }

  function removeRaw(key){
    var full = PREFIX + key;
    delete memory[full];
    var s = storage();
    if (!s) return;
    try { s.removeItem(full); } catch (e) { /* ignore */ }
  }

  P.store = {
    get: function(key, def){
      var raw = readRaw(key);
      if (raw === undefined) return def;
      try { return JSON.parse(raw); }
      catch (e) { return def; }
    },
    set: function(key, value){
      try { writeRaw(key, JSON.stringify(value)); }
      catch (e) { /* ignore unserialisable values */ }
    },
    remove: function(key){ removeRaw(key); },
    migrate: function(){
      var schema = P.store.get("schema", 0);
      if (typeof schema === "number" && schema >= SCHEMA) return false;
      var oldKeys = [["l5", "profile_g0"], ["l7", "profile_g2"]];
      for (var i = 0; i < oldKeys.length; i++){
        var value = P.store.get(oldKeys[i][0], null);
        if (value !== null && value !== undefined) P.store.set(oldKeys[i][1], value);
      }
      P.store.set("schema", SCHEMA);
      return true;
    }
  };

  P.progress = {
    load: function(grade){
      var data = P.store.get("profile_g" + grade, null);
      if (!data || typeof data !== "object") return { collection: {}, score: 0, caught: 0 };
      return data;
    },
    save: function(grade, data){
      P.store.set("profile_g" + grade, data);
    }
  };

  try { P.store.migrate(); } catch (e) { /* never break boot */ }
})(window.PM);
