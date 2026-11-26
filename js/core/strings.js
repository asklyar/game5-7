/* ============ UI STRINGS (T13) ============ */
/* All user-visible text goes through PM.t('key'). Only Ukrainian is shipped. */
window.PM = window.PM || {};
(function(P){
  P.strings = {
    uk: {
      "app.title": "⚡ Математичні Покемони ⚡",
      "app.description": "Вирішуй приклади, вчи англійську та збирай колекцію покемонів!",

      "menu.grade0": "🌱 5 років · 0 клас",
      "menu.grade2": "🚀 7 років · 2 клас",
      "menu.math": "➕ Математика",
      "menu.eng": "🔤 English",
      "menu.math0.desc": "Додавання і віднімання<br>до числа 20",
      "menu.math2.desc": "Додавання і віднімання до 60<br>та множення до 10",
      "menu.eng0.desc": "Тварини, кольори та числа<br>англійською",
      "menu.eng2.desc": "Їжа, часи, дії та тварини<br>англійською",
      "menu.play": "Грати",
      "menu.catalog": "📖 Каталог",
      "theme.night": "🌙 Нічний режим",
      "theme.day": "☀️ День",

      "game.level": "Рівень {level}{suffix}",
      "game.english": " · English",
      "game.score": "Стикування:",
      "game.caught": "Знайдено:",
      "game.menu": "🏠 Меню",
      "game.question.math": "Обери правильну відповідь!",
      "game.question.en": "Обери правильний переклад!",
      "game.praise": "Молодець! ✅",
      "game.retry": "Спробуй ще! ❌",
      "game.pickAnswer": "Обери відповідь!",
      "game.answerPlaceholder": "?"
    }
  };

  P.t = function(key, vars){
    var dict = P.strings.uk;
    var text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    if (vars){
      Object.keys(vars).forEach(function(name){
        text = text.split("{" + name + "}").join(String(vars[name]));
      });
    }
    return text;
  };

  P.applyStrings = function(root){
    var scope = root || (typeof document !== "undefined" ? document : null);
    if (!scope || !scope.querySelectorAll) return;
    var nodes = scope.querySelectorAll("[data-i18n], [data-i18n-html]");
    for (var i = 0; i < nodes.length; i++){
      var el = nodes[i];
      var htmlKey = el.getAttribute("data-i18n-html");
      var key = htmlKey || el.getAttribute("data-i18n");
      var text = P.t(key);
      if (htmlKey) el.innerHTML = text;
      else el.textContent = text;
    }
  };

  if (typeof document !== "undefined"){
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", function(){ P.applyStrings(); });
    } else {
      P.applyStrings();
    }
  }
})(window.PM);
