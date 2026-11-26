/* ============ SKILL: math.addsub60 (T17) ============
   Grade 2 (a 7-year-old): addition and subtraction within 0..60, never negative.
   Reproduces the old inline level-7 +/- question source from js/ui/game.js.

   Behaviour:
     ~50% addition      a + b,  with 0 <= a, 0 <= b, and a + b <= 60
     ~50% subtraction   a - b,  with 0 <= a and 0 <= b <= a, so a - b >= 0
   The answer is always an integer in 0..60.

   key is normalised so "a+b" and "b+a" are the same question.
   NOTE: no Cyrillic anywhere in this file. The displayed minus is U+2212. */
window.PM = window.PM || {};
(function (P) {
  if (!P.skills || typeof P.skills.register !== 'function') return;
  if (P.skills.get && P.skills.get('math.addsub60')) return;

  var MAX = 60;

  function makeRndInt(r) {
    return function (a, b) {
      var lo = Math.min(a, b);
      var hi = Math.max(a, b);
      return lo + Math.floor(r() * (hi - lo + 1));
    };
  }

  function build(op, a, b) {
    var text = (op === '+')
      ? a + ' + ' + b + ' = ?'
      : a + ' \u2212 ' + b + ' = ?';
    return {
      key: '',
      prompt: { text: text, emoji: null, speak: null },
      input: 'keypad',
      answer: (op === '+') ? a + b : a - b,
      options: null,
      hint: null
    };
  }

  P.skills.register({
    id: 'math.addsub60',
    subject: 'math',
    grade: 2,
    titleKey: 'skill.math.addsub60',
    tiers: 1,
    generate: function (ctx) {
      ctx = ctx || {};
      var r = (typeof ctx.rnd === 'function') ? ctx.rnd : P.rnd;
      var rInt = makeRndInt(r);
      var item;
      if (r() < 0.5) {
        // addition: a + b, 0 <= a, 0 <= b, a + b <= MAX
        var a = rInt(0, MAX);
        var b = rInt(0, MAX - a);
        item = build('+', a, b);
        var nums = [a, b].sort(function (x, y) { return x - y; });
        item.key = nums[0] + '+' + nums[1];
      } else {
        // subtraction: a - b, 0 <= a, 0 <= b <= a -> a - b >= 0
        var c = rInt(0, MAX);
        var d = rInt(0, c);
        item = build('\u2212', c, d);
        item.key = c + '-' + d;
      }
      return item;
    }
  });
})(window.PM);
