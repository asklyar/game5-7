/* ============ QUESTION GENERATION ============ */
function rnd(a,b){ return PM.rndInt(a, b); }

function newQuestion(){
  var keypad = document.getElementById("keypad");
  var answerArea = document.getElementById("answerArea");
  var enArea = document.getElementById("englishArea");
  var label = document.querySelector("#game .question-label");
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "feedback";

  if (MODE === "en"){
    keypad.style.display = "none";
    answerArea.style.display = "none";
    enArea.style.display = "block";
    if (label) label.textContent = PM.t("game.question.en");
    newEnglishQuestion();
    return;
  }

  // math mode
  keypad.style.display = "grid";
  answerArea.style.display = "block";
  enArea.style.display = "none";
  if (label) label.textContent = PM.t("game.question.math");
  inputStr = "";
  renderMathQuestion();
  renderAnswer();
}

function renderMathQuestion(){
  var a, b, op, correct, text;
  if (LEVEL === 5){
    // addition & subtraction to 20, result in 0..20
    if (PM.rnd() < 0.5){
      a = rnd(0, 20); b = rnd(0, 20 - a);
      op = "+"; correct = a + b;
    } else {
      a = rnd(0, 20); b = rnd(0, a);
      op = "−"; correct = a - b;
    }
  } else {
    // level 7: +/− up to 60, and multiplication up to 10
    var kind = rnd(0, 2);
    if (kind === 0){            // addition up to 60
      a = rnd(0, 60); b = rnd(0, 60 - a);
      op = "+"; correct = a + b;
    } else if (kind === 1){     // subtraction up to 60
      a = rnd(0, 60); b = rnd(0, a);
      op = "−"; correct = a - b;
    } else {                    // multiplication table up to 10
      a = rnd(1, 10); b = rnd(1, 10);
      op = "×"; correct = a * b;
    }
  }
  text = a + " " + op + " " + b + " = ?";
  question = { text: text, correct: correct };
  if (PM.noRepeat.check(question, 'math')) {
    renderQuestion();
    PM.noRepeat.record(question, 'math');
  } else {
    renderMathQuestion();
  }
}

function renderQuestion(){
  document.getElementById("question").textContent = question.text;
}

/* ============ ENGLISH QUESTION ============ */
function newEnglishQuestion(){
  var bank = (LEVEL === 5) ? EN_WORDS_5 : EN_WORDS_7;
  var pair = bank[rnd(0, bank.length - 1)];
  var uk = pair[0], en = pair[1];

  // build options: the correct english + 3 random distractors
  var others = [];
  for (var i=0;i<bank.length;i++){
    if (bank[i][1] !== en) others.push(bank[i][1]);
  }
  var options = [en];
  while (options.length < 4 && others.length > 0){
    var pick = others.splice(rnd(0, others.length - 1), 1)[0];
    options.push(pick);
  }
  // shuffle options
  for (var j=options.length-1; j>0; j--){
    var k = rnd(0, j);
    var t = options[j]; options[j] = options[k]; options[k] = t;
  }

  question = { uk: uk, en: en, options: options };
  if (PM.noRepeat.check(question, 'en')) {
    document.getElementById("question").textContent = uk.toUpperCase();
    var box = document.getElementById("enOptions");
    box.innerHTML = "";
    for (var o=0;o<options.length;o++){
      var btn = document.createElement("button");
      btn.className = "en-option";
      btn.textContent = options[o].toUpperCase();
      (function(opt){
        btn.onclick = function(){ checkEnglish(opt); };
      })(options[o]);
      box.appendChild(btn);
    }
    PM.noRepeat.record(question, 'en');
  } else {
    newEnglishQuestion();
  }
}

function checkEnglish(opt){
  var fbEl = document.getElementById("feedback");
  var buttons = document.getElementById("enOptions").querySelectorAll(".en-option");
  if (opt === question.en){
    for (var i=0;i<buttons.length;i++){
      if (buttons[i].textContent === question.en.toUpperCase()) buttons[i].classList.add("correct");
      buttons[i].onclick = null;
    }
    fb(PM.t("game.praise"), "good");
    if (PM && PM.emit) PM.emit("answer:correct");
    score++;
    caught++;
    updateStats();
    catchPokemon();
  } else {
    for (var k=0;k<buttons.length;k++){
      if (buttons[k].textContent === opt.toUpperCase()) buttons[k].classList.add("wrong");
    }
    fb(PM.t("game.retry"), "bad");
    if (PM && PM.emit) PM.emit("answer:wrong");
  }
}

/* ============ KEYPAD ============ */
function pressKey(d){
  if (inputStr.length >= 3) return;       // results max 3 digits (e.g. 10×10=100)
  inputStr += d;
  renderAnswer();
}
function delKey(){
  if (inputStr.length === 0) return;
  inputStr = inputStr.slice(0, -1);
  renderAnswer();
}
function clearKey(){
  inputStr = "";
  renderAnswer();
}
function renderAnswer(){
  var el = document.getElementById("answerArea");
  if (inputStr === ""){ el.textContent = "?"; el.classList.add("empty"); }
  else { el.textContent = inputStr; el.classList.remove("empty"); }
}

/* ============ CHECK ============ */
function checkAnswer(){
  if (inputStr === ""){
    fb(PM.t("game.pickAnswer"), "bad");
    return;
  }
  var val = parseInt(inputStr, 10);
  var fbEl = document.getElementById("feedback");
  if (val === question.correct){
    fb(PM.t("game.praise"), "good");
    if (PM && PM.emit) PM.emit("answer:correct");
    score++;
    caught++;
    updateStats();
    catchPokemon();
  } else {
    fb(PM.t("game.retry"), "bad");
    if (PM && PM.emit) PM.emit("answer:wrong");
    // do not advance, let child retry
  }
}
function fb(msg, cls){
  var el = document.getElementById("feedback");
  el.textContent = msg;
  el.className = "feedback " + cls;
}

/* ============ CATCH + EVOLUTION ============ */
function starsFor(stageIndex){
  // 1 star for stage 0, +1 per evolution, max 5
  return Math.min(5, 1 + stageIndex);
}
function starsStr(n){
  var s = "";
  for (var i=0;i<5;i++) s += (i < n ? "★" : "☆");
  return s;
}

function stageOf(p, index){ return p.stages[index]; }
function imgUrl(dex){ return ART + dex + ".png"; }

function catchPokemon(){
  // Only pokemon that can still evolve may be caught.
  // A pokemon that already reached its strongest form is excluded,
  // so it can never be caught again.
  var available = [];
  for (var i=0;i<POKEMON.length;i++){
    var p = POKEMON[i];
    var cur = (collection[p.id] === undefined) ? -1 : collection[p.id];
    if (cur < p.stages.length - 1) available.push(p.id);
  }

  // Nothing left to evolve — the whole collection is complete.
  if (available.length === 0){
    showCollectionComplete();
    return;
  }

  var pickId = available[rnd(0, available.length - 1)];

  var p = null;
  for (var j=0;j<POKEMON.length;j++){ if (POKEMON[j].id === pickId){ p = POKEMON[j]; break; } }

  var cur = (collection[p.id] === undefined) ? -1 : collection[p.id];
  var newStage;
  var evolved = false;
  if (cur === -1){
    newStage = 0;
  } else {
    newStage = cur + 1;          // always < stages.length-1 here, so it always evolves
    evolved = (newStage > cur);
  }
  collection[p.id] = newStage;

  var st = stageOf(p, newStage);
  var stars = starsFor(newStage);

  // image with emoji fallback
  var img = document.getElementById("modalImg");
  img.onerror = function(){ img.style.display="none"; document.getElementById("modalEmoji").style.display="block"; };
  img.style.display = "block";
  document.getElementById("modalEmoji").style.display = "none";
  img.src = imgUrl(st.dex);
  document.getElementById("modalName").textContent = st.name;
  document.getElementById("modalStars").textContent = starsStr(stars) + "  (" + stars + "/5)";
  document.getElementById("modalAbility").textContent = "⚡ " + (st.ability || "");

  var evoEl = document.getElementById("modalEvo");
  if (cur === -1){
    evoEl.textContent = "Новий покемон у колекції!";
    evoEl.style.color = "#2e8b2e";
  } else {
    evoEl.textContent = "⭐ Еволюція! " + stageOf(p,cur).name + " → " + st.name;
    evoEl.style.color = "#c0392b";
  }
  document.getElementById("overlay").classList.add("active");
  if (PM && PM.emit) PM.emit("catch:done", { evolved: evolved });
  saveGame();
}

function showCollectionComplete(){
  var img = document.getElementById("modalImg");
  img.style.display = "none";
  var emo = document.getElementById("modalEmoji");
  emo.style.display = "block";
  emo.textContent = "🏆";
  document.getElementById("modalName").textContent = "Ура!";
  document.getElementById("modalStars").textContent = "Колекцію завершено!";
  document.getElementById("modalAbility").textContent = "";
  var evoEl = document.getElementById("modalEvo");
  evoEl.textContent = "Усі покемони досягли найсильнішої форми!";
  evoEl.style.color = "#2e8b2e";
  document.getElementById("overlay").classList.add("active");
}

function closeModal(){
  document.getElementById("overlay").classList.remove("active");
  newQuestion();
}
function closeModalOpenCatalog(){
  document.getElementById("overlay").classList.remove("active");
  openCatalog();
}

