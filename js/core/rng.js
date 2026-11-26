/* ============ SEEDED RNG & CLOCK (T12) ============ */
/* Game logic must use PM.rnd()/PM.rndInt()/PM.pick()/PM.shuffle()/PM.now()
   instead of Math.random()/Date.now(). Test params: ?seed=123&now=1700000000000 */
window.PM = window.PM || {};
(function(P){
  function param(name){
    try {
      var params = new URLSearchParams(window.location.search || "");
      var value = params.get(name);
      return value === null ? null : value;
    } catch (e) { return null; }
  }

  function mulberry32(seed){
    var a = seed >>> 0;
    return function(){
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var seedParam = param("seed");
  var parsed = parseInt(seedParam, 10);
  var seed = (seedParam !== null && !isNaN(parsed))
    ? parsed
    : Math.floor(Math.random() * 4294967296);
  var rnd = mulberry32(seed);

  P.rnd = function(){ return rnd(); };

  P.rndInt = function(a, b){
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    return lo + Math.floor(rnd() * (hi - lo + 1));
  };

  P.pick = function(list){
    if (!list || list.length === 0) return undefined;
    return list[P.rndInt(0, list.length - 1)];
  };

  P.shuffle = function(list){
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--){
      var j = P.rndInt(0, i);
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  };

  var nowParam = param("now");
  var fixedNow = nowParam !== null ? Number(nowParam) : null;
  P.now = function(){
    return (fixedNow !== null && !isNaN(fixedNow)) ? fixedNow : Date.now();
  };
})(window.PM);
