/* ============ SKILL: eng.vocab.g0 & eng.vocab.g2 (T18) ============
   English vocabulary skills for Grade 0 and Grade 2.
   Uses PM.data.words to generate multiple-choice translation questions:
     - Prompt: Ukrainian word (single words displayed uppercase)
     - Options: 4 unique English words (single words displayed uppercase)
     - Distractors from the same topic when topic is set, otherwise random.
     - Includes the correct English translation in the options.
   Satisfies the skill contract in TASKS.md section 1.
   NOTE: No Cyrillic in this file (scanned by no-hardcoded-text test). */
window.PM = window.PM || {};
(function (P) {
  if (!P.skills || typeof P.skills.register !== 'function') return;
  if (P.skills.get && P.skills.get('eng.vocab.g0')) return;

  function isSingleWord(str) {
    if (typeof str !== 'string') return false;
    var trimmed = str.trim();
    return trimmed.length > 0 && !/\s/.test(trimmed);
  }

  function formatWord(str) {
    if (typeof str !== 'string') return '';
    return isSingleWord(str) ? str.toUpperCase() : str;
  }

  function makeRndInt(r) {
    return function (a, b) {
      var lo = Math.min(a, b);
      var hi = Math.max(a, b);
      return lo + Math.floor(r() * (hi - lo + 1));
    };
  }

  function shuffle(list, rInt) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = rInt(0, i);
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function pickDistractors(words, target, rInt) {
    var distractors = [];
    var hasTopic = Boolean(target.topic && typeof target.topic === 'string' && target.topic.trim().length > 0);

    if (hasTopic) {
      var topicPool = [];
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (w.en !== target.en && w.topic === target.topic) {
          topicPool.push(w);
        }
      }
      while (distractors.length < 3 && topicPool.length > 0) {
        var idx = rInt(0, topicPool.length - 1);
        distractors.push(topicPool.splice(idx, 1)[0]);
      }
    }

    if (distractors.length < 3) {
      var otherPool = [];
      for (var j = 0; j < words.length; j++) {
        var ow = words[j];
        if (ow.en === target.en) continue;
        var already = false;
        for (var k = 0; k < distractors.length; k++) {
          if (distractors[k].en === ow.en) {
            already = true;
            break;
          }
        }
        if (!already) otherPool.push(ow);
      }
      while (distractors.length < 3 && otherPool.length > 0) {
        var oidx = rInt(0, otherPool.length - 1);
        distractors.push(otherPool.splice(oidx, 1)[0]);
      }
    }

    return distractors;
  }

  function generateQuestion(words, r) {
    var rInt = makeRndInt(r);
    var target = words[rInt(0, words.length - 1)];
    var distractors = pickDistractors(words, target, rInt);
    var all = [target].concat(distractors);

    var options = [];
    for (var i = 0; i < all.length; i++) {
      options.push({
        label: formatWord(all[i].en),
        emoji: all[i].emoji || null
      });
    }
    options = shuffle(options, rInt);

    return {
      key: target.en,
      prompt: {
        text: formatWord(target.uk),
        emoji: target.emoji || null,
        speak: target.en
      },
      input: 'choice',
      answer: formatWord(target.en),
      options: options,
      hint: { text: null }
    };
  }

  function registerSkill(id, grade, gradeKey) {
    P.skills.register({
      id: id,
      subject: 'eng',
      grade: grade,
      titleKey: 'skill.' + id,
      tiers: 1,
      generate: function (ctx) {
        ctx = ctx || {};
        var words = ctx.words || (P.data && P.data.words && P.data.words[gradeKey]) || [];
        if (!words || words.length < 4) {
          throw new Error('PM.skills.' + id + ': need at least 4 words in word bank');
        }
        var r = (typeof ctx.rnd === 'function') ? ctx.rnd : P.rnd;
        return generateQuestion(words, r);
      }
    });
  }

  registerSkill('eng.vocab.g0', 0, 'grade0');
  registerSkill('eng.vocab.g2', 2, 'grade2');
})(window.PM);
