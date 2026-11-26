/* ============ SKILL: math.add20 (T16) ============
   Grade 0 (a 5-year-old): addition and subtraction within 0..20, never negative.
   This reproduces the old inline level-5 question source that used to live in
   js/ui/game.js (extracted in T07), now produced as a registered skill so the
   game can ask the registry instead of computing the question inline.

   Behaviour (unchanged from the old renderMathQuestion):
     ~50% addition      a + b,  with 0 <= a, 0 <= b, and a + b <= 20
     ~50% subtraction   a - b,  with 0 <= a and 0 <= b <= a, so a - b >= 0
   The answer is always an integer in 0..20.

   key is normalised so "a+b" and "b+a" are the same question.

   NOTE: no Cyrillic anywhere in this file (the no-hardcoded-text test scans it).
   The displayed minus is U+2212 (a math sign, not a letter). */
window.PM = window.PM || {};
(function (P) {
  // registry.js must load first; register the skill only once.
  if (!P.skills || typeof P.skills.register !== 'function') return;
  if (P.skills.get && P.skills.get('math.add20')) return;

  var MAX = 20; // both operands and the result stay inside 0..MAX

  // Integer in [lo, hi] from a generator r() -> [0,1). Mirrors PM.rndInt.
  function makeRndInt(r) {
    return function (a, b) {
      var lo = Math.min(a, b);
      var hi = Math.max(a, b);
      return lo + Math.floor(r() * (hi - lo + 1));
    };
  }

  // Build a keypad item from operands and operator. op is '+' or the math minus.
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
      hint: { text: null, dots: [a, b] }
    };
  }

  P.skills.register({
    id: 'math.add20',
    subject: 'math',
    grade: 0,
    titleKey: 'skill.math.add20',
    tiers: 1,
    // ctx = { rnd, tier, profile }; rnd() -> [0,1). Falls back to PM.rnd.
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
        item.key = nums[0] + '+' + nums[1]; // normalised: a+b === b+a
      } else {
        // subtraction: a - b, 0 <= a, 0 <= b <= a  ->  a - b >= 0
        var c = rInt(0, MAX);
        var d = rInt(0, c);
        item = build('\u2212', c, d);
        item.key = c + '-' + d; // subtraction is not commutative
      }
      return item;
    }
  });
})(window.PM);
