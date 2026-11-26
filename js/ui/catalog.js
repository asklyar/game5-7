/* ============ CATALOG ============ */
function buildCatalog(){
  var grid = document.getElementById("catalogGrid");
  grid.innerHTML = "";
  var totalStars = 0, caughtStars = 0;
  var maxStages = 0;
  for (var i=0;i<POKEMON.length;i++){
    var p = POKEMON[i];
    maxStages += p.stages.length;
  }
  var caughtCount = 0;
  for (var k=0;k<POKEMON.length;k++){
    var pp = POKEMON[k];
    var cur = (collection[pp.id] === undefined) ? -1 : collection[pp.id];
    var card = document.createElement("div");
    card.className = "poke-card" + (cur === -1 ? " locked" : "");

    var stars = cur === -1 ? 0 : starsFor(cur);
    var caughtStarsVal = cur === -1 ? 0 : stars;
    caughtStars += caughtStarsVal;

    var nameLine, evoLine;
    if (cur === -1){
      nameLine = "???" ;
      evoLine  = "Ще не знайдено";
      caughtCount += 0;
    } else {
      nameLine = pp.stages[cur].name;
      caughtCount++;
      if (cur < pp.stages.length - 1){
        evoLine = "→ " + pp.stages[cur + 1].name + " далі";
      } else {
        evoLine = "Найсильніша форма!";
      }
    }

    var imgHtml = (cur === -1)
      ? '<div class="poke-emoji">❔</div>'
      : '<img src="' + imgUrl(pp.stages[cur].dex) + '" alt="' + nameLine + '" ' +
        'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';" ' +
        'style="display:block;width:120px;height:120px;margin:0 auto;object-fit:contain;image-rendering:pixelated;">' +
        '<div class="poke-emoji" style="display:none">' + pp.stages[cur].emoji + '</div>';

    var abilityText = (cur === -1) ? "" : "⚡ " + (pp.stages[cur].ability || "");

    // full evolution chain, each stage marked done/locked
    var chainHtml = "";
    for (var s = 0; s < pp.stages.length; s++){
      var stage = pp.stages[s];
      var cls = "evo-stage";
      if (cur === -1){
        cls += " locked";
      } else if (s <= cur){
        cls += " done";
      } else {
        cls += " locked";
      }
      var stageImg =
        '<img src="' + imgUrl(stage.dex) + '" alt="' + stage.name + '" ' +
        'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';" ' +
        'style="display:block;width:72px;height:72px;object-fit:contain;image-rendering:pixelated;">' +
        '<div class="es-emoji" style="display:none">' + stage.emoji + '</div>';
      chainHtml +=
        '<div class="' + cls + '">' +
          stageImg +
          '<div class="es-info">' +
            '<div class="es-name">' + stage.name + '</div>' +
            '<div class="es-stars">' + starsStr(starsFor(s)) + '</div>' +
            '<div class="es-ability">⚡ ' + (stage.ability || "") + '</div>' +
          '</div>' +
        '</div>';
    }

    card.innerHTML =
      imgHtml +
      '<div class="pname">' + nameLine + '</div>' +
      '<div class="pstars">' + starsStr(caughtStarsVal) + '</div>' +
      '<div class="ability">' + abilityText + '</div>' +
      '<div class="pevo">' + evoLine + '</div>' +
      '<div class="chain-toggle" data-action="toggle-chain">▶ Еволюції</div>' +
      '<div class="evo-expand">' + chainHtml + '</div>';
    grid.appendChild(card);
  }
  document.getElementById("catalogStats").textContent =
    "Знайдено покемонів: " + caughtCount + " з " + POKEMON.length +
    "  |  Усього зірок: " + caughtStars + "/" + maxStars(POKEMON);
}
function maxStars(list){
  var m = 0;
  for (var i=0;i<list.length;i++){
    var p = list[i];
    var full = p.stages.length - 1;
    m += Math.min(5, 1 + full);
  }
  return m;
}

