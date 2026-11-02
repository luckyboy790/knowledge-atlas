/* Stable per-session display order; original keys remain the grading identity. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ChoiceOrder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function applies(q) {
    // These explanations refer to content, not original option letters.
    return /^(?:cn[pcbg]_|cnm_ps\d+|cs408_|med_|tcm_|herbal_|uphy_|uch_)/.test(q.topicId) || q.topicId === 'cnm_p024';
  }
  function ordered(q, seed) {
    const a = (q.choices || []).map(function (c) { return Object.assign({}, c); });
    if (applies(q)) {
      const key = String(seed) + ':' + q.id;
      let state = 2166136261;
      for (let i = 0; i < key.length; i++) state = Math.imul(state ^ key.charCodeAt(i), 16777619);
      function random() {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
    }
    return a.map(function (c, i) {
      c.label = applies(q) ? String.fromCharCode(65 + i) : c.key;
      return c;
    });
  }
  return { ordered: ordered };
});
