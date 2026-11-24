#!/usr/bin/env python3
# Autotest harness for pokemon-math index.html.
# Strategy: load index.html, inject a JS test block before </body> that runs
# assertions and writes a JSON results blob into #__testresult__, then dump DOM
# with Chrome headless and parse the results.
import re, json, os, sys, subprocess, tempfile, shutil

INDEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# The JS test block. Runs in page context after the game script is defined.
TEST_JS = r"""
<script>
(function(){
  var R = {pass:0, fail:0, log:[]};
  function ok(cond, msg){ if(cond){R.pass++;} else {R.fail++; R.log.push("FAIL: "+msg);} }
  function eq(a,b,msg){ ok(a===b, msg+" (got "+a+", want "+b+")"); }

  try {
    // 1) Data integrity
    ok(Array.isArray(POKEMON), "POKEMON is array");
    eq(POKEMON.length, 98, "POKEMON family count");
    var totalStages = 0, allHaveAbility = true, allHaveDex = true, allHaveName = true, allHaveEmoji = true;
    for (var i=0;i<POKEMON.length;i++){
      var p = POKEMON[i];
      totalStages += p.stages.length;
      for (var s=0;s<p.stages.length;s++){
        var st = p.stages[s];
        if (!st.ability) allHaveAbility = false;
        if (!st.dex) allHaveDex = false;
        if (!st.name) allHaveName = false;
        if (!st.emoji) allHaveEmoji = false;
      }
    }
    eq(totalStages, 200, "total stages");
    ok(allHaveAbility, "every stage has ability");
    ok(allHaveDex, "every stage has dex");
    ok(allHaveName, "every stage has name");
    ok(allHaveEmoji, "every stage has emoji");

    // 2) Pure helpers
    eq(starsFor(0), 1, "starsFor(0)=1");
    eq(starsFor(4), 5, "starsFor(4)=5 (capped)");
    eq(starsFor(10), 5, "starsFor(10)=5 (capped)");
    ok(/^★★★/.test(starsStr(3)), "starsStr(3) three filled stars");
    eq(starsStr(3), "★★★☆☆", "starsStr(3) exact");
    ok(imgUrl(1).indexOf("/1.png")>=0, "imgUrl builds artwork path");

    // 3) Catch mechanism + localStorage
    // Reset state
    collection = {}; score = 0; caught = 0;
    startGame(5);
    ok(document.getElementById("game").classList.contains("active"), "game screen active after startGame");
    // Answer current question correctly
    inputStr = String(question.correct);
    checkAnswer();
    ok(document.getElementById("overlay").classList.contains("active"), "overlay active after correct answer");
    eq(caught, 1, "caught=1 after one catch");
    eq(score, 1, "score=1 after one catch");
    // collection updated
    var caughtFamily = null;
    for (var cid in collection){ if (collection[cid] !== -1) caughtFamily = cid; }
    ok(caughtFamily !== null, "a family recorded in collection");
    // modal ability populated
    var ab = document.getElementById("modalAbility").textContent;
    ok(ab.indexOf("⚡") === 0, "modalAbility starts with lightning bolt");
    ok(ab.length > 2, "modalAbility has ability text");
    // localStorage saved
    var raw = localStorage.getItem("pokemath_l5");
    ok(raw !== null, "localStorage pokemath_l5 written");
    var saved = JSON.parse(raw);
    ok(saved && saved.collection && (caughtFamily in saved.collection), "saved collection has caught family");
    eq(saved.score, 1, "saved score=1");
    eq(saved.caught, 1, "saved caught=1");

    // 4) loadGame restores
    collection = {}; score = 0; caught = 0;
    loadGame(5);
    eq(score, 1, "loadGame restores score");
    eq(caught, 1, "loadGame restores caught");
    ok(caughtFamily in collection, "loadGame restores collection");
    eq(collection[caughtFamily], saved.collection[caughtFamily], "loadGame restores stage index");

    // 5) Evolution: force a family to evolve across calls
    // pick a family with >=2 stages
    var fam = POKEMON[1]; // Charmander family, 3 stages
    collection = {}; collection[fam.id] = 0;
    // call catchPokemon in a loop forcing that family only by making others maxed
    // Simpler: directly test that evolving raises the stage and stars
    var before = collection[fam.id];
    // set all OTHER families to max so only fam remains available
    for (var q=0;q<POKEMON.length;q++){
      if (POKEMON[q].id !== fam.id) collection[POKEMON[q].id] = POKEMON[q].stages.length - 1;
    }
    inputStr = String(question.correct);
    checkAnswer(); // catches fam, evolves 0 -> 1
    var after = collection[fam.id];
    eq(after, before + 1, "evolution advanced stage index");
    var stAfter = fam.stages[after];
    eq(document.getElementById("modalName").textContent, stAfter.name, "modal name = evolved name");
    ok(document.getElementById("modalEvo").textContent.indexOf("Еволюція") >= 0, "evo note shows evolution");

    // 6) Catalog rendering: ability + chain toggle + evo-expand
    collection = {};
    collection[POKEMON[10].id] = 1; // family id 10 = Pikachu-ish (3 stages)
    buildCatalog();
    var grid = document.getElementById("catalogGrid");
    var cards = grid.querySelectorAll(".poke-card");
    eq(cards.length, 98, "catalog has 98 cards");
    // find the card that contains a chain-toggle and ability
    var abilityDivs = grid.querySelectorAll(".poke-card .ability");
    ok(abilityDivs.length >= 1, "at least one card renders .ability");
    var toggles = grid.querySelectorAll(".chain-toggle");
    eq(toggles.length, 98, "every card has a chain-toggle");
    var expands = grid.querySelectorAll(".evo-expand");
    eq(expands.length, 98, "every card has an evo-expand panel");
    // expand one and check stages
    var firstToggle = toggles[0];
    firstToggle.parentElement.classList.add("expanded");
    var stages = firstToggle.parentElement.querySelectorAll(".evo-stage");
    ok(stages.length >= 1, "expanded card shows evo-stage rows");
    ok(firstToggle.parentElement.querySelector(".es-ability") !== null, "evo-stage shows ability");
    // ability text on the caught family card
    var caughtCard = null;
    for (var c=0;c<cards.length;c++){
      if (cards[c].querySelector(".pstars") && cards[c].querySelector(".ability").textContent.length > 2){
        caughtCard = cards[c]; break;
      }
    }
    ok(caughtCard !== null, "a caught card shows non-empty ability");
    ok(caughtCard.querySelector(".ability").textContent.indexOf("⚡") === 0, "card ability has lightning");

    // 7) Level 7 load is independent
    loadGame(7);
    eq(score, 0, "level7 fresh score=0");
    eq(caught, 0, "level7 fresh caught=0");
  } catch(e){
    R.fail++; R.log.push("EXCEPTION: " + e.message + "\n" + e.stack);
  }
  var out = document.createElement("div");
  out.id = "__testresult__";
  out.textContent = "TESTRESULT " + JSON.stringify(R);
  document.body.appendChild(out);
})();
</script>
"""

def main():
    html = open(INDEX, encoding="utf-8").read()
    assert "</body>" in html
    injected = html.replace("</body>", TEST_JS + "\n</body>")
    tmpd = tempfile.mkdtemp()
    testpath = os.path.join(tmpd, "test.html")
    with open(testpath, "w", encoding="utf-8") as f:
        f.write(injected)
    profile = os.path.join(tmpd, "profile")
    cmd = [
        CHROME, "--headless=new", "--no-sandbox",
        "--disable-gpu", "--no-first-run", "--no-default-browser-check",
        "--user-data-dir=" + profile,
        "--virtual-time-budget=8000",
        "--dump-dom",
        "file://" + testpath,
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        dom = out.stdout
    except Exception as e:
        print("CHROME_RUN_FAILED:", e)
        print(out.stdout if 'out' in dir() else "")
        print(out.stderr if 'out' in dir() else "")
        return 2
    m = re.search(r'TESTRESULT (\{.*?\})\s*$', dom, re.S)
    if not m:
        m = re.search(r'TESTRESULT (\{.*\})', dom, re.S)
    if not m:
        print("NO_RESULT_FOUND. stderr:", out.stderr[-2000:])
        print("--- last 1500 of dom ---")
        print(dom[-1500:])
        return 1
    R = json.loads(m.group(1))
    print("PASS:", R["pass"], "FAIL:", R["fail"])
    for line in R.get("log", []):
        print(line)
    shutil.rmtree(tmpd, ignore_errors=True)
    return 0 if R["fail"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
