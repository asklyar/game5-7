/* ============ NO REPEATED QUESTIONS (PM-02) ============
   Ensures that questions are not repeated within a certain window.
   AC1: Math level 5 - no repeats in window of 5.
   AC2: English level 7 - no word repeats in window of 2.
   AC3: 3 + 4 and 4 + 3 are considered the same.
*/
(function(){
  var PM = window.PM || {};

  if (PM.noRepeat) return;

  var history = [];

  var config = {
    math: { window: 5, compare: true },
    en: { window: 2, compare: false }
  };

  // Helper to normalize math questions
  // Handles cases like "3 + 4" and "4 + 3" by sorting the numbers
  function normalizeMath(a, b, op) {
    var nums = [a, b].sort((x, y) => x - y);
    return { nums: nums.join(','), op: op };
  }

  // Checks if a question is valid given the recent history.
  // @param {Object} q - The question object
  // @param {string} type - 'math' or 'en'
  // @returns {boolean}
  PM.noRepeat = PM.noRepeat || {};
  PM.noRepeat.check = function(q, type) {
    var identity;
    if (type === 'math') {
      const parts = q.text.split(' ');
      const a = parseInt(parts[0], 10);
      const b = parseInt(parts[2], 10);
      const op = parts[1];
      identity = normalizeMath(a, b, op).nums;
    } else {
      identity = q.en;
    }

    var win = config[type].window;
    for (var i = 0; i < Math.min(history.length, win); i++) {
      var prev = history[history.length - 1 - i];
      if (prev.identity === identity) return false;
    }
    return true;
  };

  /**
   * Records a question in the history.
   * @param {Object} q - The question object
   * @param {string} type - 'math' or 'en'
   */
  PM.noRepeat.record = function(q, type) {
    let identity;
    if (type === 'math') {
      const parts = q.text.split(' ');
      const a = parseInt(parts[0], 10);
      const b = parseInt(parts[2], 10);
      const op = parts[1];
      identity = normalizeMath(a, b, op).nums;
    } else {
      identity = q.en;
    }
    history.push({ identity: identity, type: type });
    if (history.length > 50) history.shift();
  };

  PM.noRepeat = {
    check: PM.noRepeat.check,
    record: PM.noRepeat.record
  };
})();
