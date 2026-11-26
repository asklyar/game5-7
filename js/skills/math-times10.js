/* ============ SKILL: math.times10 (T17) ============
   Grade 2 (a 7-year-old): multiplication table 1..10.
   Reproduces the old inline level-7 multiplication from js/ui/game.js.

   Behaviour:
     Multiplication: a * b, with 1 <= a <= 10 and 1 <= b <= 10.
     Answer is an integer in 1..100.

   key is normalised so "a*b" and "b*a" are the same question.
   NOTE: no Cyrillic anywhere in this file. The displayed multiplication sign is U+00D7. */
window.PM = window.PM || {};
(function (P) {
  if (!P.skills || typeof P.skills.register !== 'function') return;
  if (P.skills.get && P.skills.get('math.times10')) return;

  function makeRndInt(r) {
    return function (a, b) {
      var lo = Math.min(a, b);
      var hi = Math.max(a, b);
      return lo + Math.floor(r() * (hi - lo + 1));
    };
  }

  P.skills.register({
    id: 'math.times10',
    subject: 'math',
    grade: 2,
    titleKey: 'skill.math.times10',
    tiers: 1,
    generate: function (ctx) {
      ctx = ctx || {};
      var r = (typeof ctx.rnd === 'function') ? ctx.rnd : P.rnd;
      var rInt = makeRndInt(r);
      var a = rInt(1, 10);
      var b = rInt(1, 10);
      var text = a + ' \u00D7 ' + b + ' = ?';
      var nums = [a, b].sort(function (x, y) { return x - y; });
      return {
        key: nums[0] + '*' + nums[1],
        prompt: { text: text, emoji: null, speak: null },
        input: 'keypad',
        answer: a * b,
        options: null,
        hint: null
      };
    }
  });
})(window.PM);
