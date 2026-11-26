/* ============ THIN DATA ALIASES ============ */
var POKEMON = PM.data.pokemon;
var imgUrl = PM.data.artUrl;
var EN_WORDS_5 = PM.data.words.grade0.map(function(w){ return [w.uk, w.en]; });
var EN_WORDS_7 = PM.data.words.grade2.map(function(w){ return [w.uk, w.en]; });

/* ============ STATE ============ */
var LEVEL = 5;
var MODE = "math";       // "math" or "en"
var question = null;     // math: {text, correct}   en: {uk, en, options:[...]}
var inputStr = "";
var score = 0;
var caught = 0;
// collection: id -> current stage index (0-based). -1 / undefined = not caught
var collection = {};

function show(id){
  var screens = document.querySelectorAll(".screen");
  for (var i=0;i<screens.length;i++) screens[i].classList.remove("active");
  document.getElementById(id).classList.add("active");
}

/* ============ PERSISTENCE (versioned store, v1) ============ */
function gradeForLevel(level){ return level === 5 ? 0 : 2; }
function saveGame(){
  PM.progress.save(gradeForLevel(LEVEL), {
    collection: collection, score: score, caught: caught
  });
}
function loadGame(level){
  var s = PM.progress.load(gradeForLevel(level));
  if (s && s.collection){
    collection = s.collection;
    score = s.score || 0;
    caught = s.caught || 0;
  } else {
    collection = {}; score = 0; caught = 0;
  }
}

/* ============ THEME (day / night) ============ */
function applyTheme(night){
  var body = document.body;
  if (night) body.classList.add("night");
  else body.classList.remove("night");
  var label = night ? PM.t("theme.day") : PM.t("theme.night");
  var shortLabel = night ? "☀️" : "🌙";
  var menuBtn = document.getElementById("menuThemeBtn");
  var gameBtn = document.getElementById("gameThemeBtn");
  var catBtn = document.getElementById("catalogThemeBtn");
  if (menuBtn) menuBtn.textContent = label;
  if (gameBtn) gameBtn.textContent = shortLabel;
  if (catBtn) catBtn.textContent = shortLabel;
}
function saveTheme(night){
  if (PM.settings) PM.settings.set("theme", night ? "night" : "day");
}
function toggleTheme(){
  var night = !document.body.classList.contains("night");
  applyTheme(night);
  saveTheme(night);
}
function restoreTheme(){
  var night = !!(PM.settings && PM.settings.get("theme") === "night");
  applyTheme(night);
}
restoreTheme();
updateLevelLabel();

/* ============ MENU / NAV ============ */
function startGame(level, mode){
  LEVEL = level;
  MODE = (mode === "en") ? "en" : "math";
  loadGame(level);
  updateLevelLabel();
  updateStats();
  show("game");
  newQuestion();
}
function updateLevelLabel(){
  document.getElementById("levelLabel").textContent = PM.t("game.level", {
    level: LEVEL,
    suffix: MODE === "en" ? PM.t("game.english") : ""
  });
}
function goMenu(){ show("menu"); }
function openCatalog(){ buildCatalog(); show("catalog"); }

function updateStats(){
  document.getElementById("score").textContent = score;
  document.getElementById("caughtCount").textContent = caught;
}

/* ============ KEYBOARD SUPPORT (for desktop, math mode only) ============ */
document.addEventListener("keydown", function(e){
  if (MODE === "en") return;
  if (!document.getElementById("game").classList.contains("active")) return;
  if (e.key >= "0" && e.key <= "9") pressKey(e.key);
  else if (e.key === "Backspace") delKey();
  else if (e.key === "Enter") checkAnswer();
  else if (e.key === "Escape") clearKey();
});


/* ============ ACTION DELEGATION (T09) ============ */
(function(){
  var ACTIONS = {
    "start": function(el){
      var parts = (el.getAttribute("data-arg") || "").split(",");
      startGame(Number(parts[0]), parts[1]);
    },
    "press-key": function(el){ pressKey(el.getAttribute("data-arg")); },
    "delete-key": function(){ delKey(); },
    "clear-key": function(){ clearKey(); },
    "check-answer": function(){ checkAnswer(); },
    "go-menu": function(){ goMenu(); },
    "open-catalog": function(){ openCatalog(); },
    "toggle-theme": function(){ toggleTheme(); },
    "close-modal": function(){ closeModal(); },
    "close-modal-catalog": function(){ closeModalOpenCatalog(); },
    "toggle-chain": function(el){
      var card = el.parentElement;
      if (card) card.classList.toggle("expanded");
    }
  };

  document.addEventListener("click", function(e){
    var el = e.target && e.target.closest ? e.target.closest("[data-action]") : null;
    if (!el) return;
    var fn = ACTIONS[el.getAttribute("data-action")];
    if (fn) fn(el, e);
  });
})();
