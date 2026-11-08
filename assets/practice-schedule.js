// Calendar days in the learner's local timezone. One successful due review advances one step.
(function (root) {
  'use strict';
  const gaps = [1, 3, 7, 14, 30];
  const prefix = 'atlas.practice.v1.';
  const memory = new Map();
  let persistent = true;

  function dateKey(date) {
    const two = n => String(n).padStart(2, '0');
    return [date.getFullYear(), two(date.getMonth() + 1), two(date.getDate())].join('-');
  }
  function nextDate(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return dateKey(next);
  }
  function records(subject) {
    const base = prefix + subject + '.';
    const result = new Map();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(base)) continue;
        let value;
        try { value = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
        if (value && Number.isInteger(value.step) && value.step >= 0 && value.step < gaps.length &&
            /^\d{4}-\d{2}-\d{2}$/.test(value.due) && Array.isArray(value.recent)) {
          result.set(key.slice(base.length), value);
        }
      }
    } catch (_) { persistent = false; }
    for (const [key, value] of memory) if (key.startsWith(base)) result.set(key.slice(base.length), value);
    return result;
  }
  function record(subject, id, qid, correct, now = new Date()) {
    const prior = records(subject).get(id);
    const today = dateKey(now);
    const advance = correct && prior && prior.due <= today;
    const step = correct && prior ? Math.min(prior.step + (advance ? 1 : 0), gaps.length - 1) : 0;
    const due = correct && prior && !advance ? prior.due : nextDate(now, gaps[step]);
    const recent = [qid, ...(prior ? prior.recent : []).filter(x => x !== qid)].slice(0, 12);
    const value = {step, due, recent};
    const key = prefix + subject + '.' + id;
    try { localStorage.setItem(key, JSON.stringify(value)); memory.delete(key); }
    catch (_) { persistent = false; memory.set(key, value); }
    return value;
  }
  function dueEntries(entries, now = new Date()) {
    const today = dateKey(now);
    return [...entries].filter(([, value]) => value.due <= today)
      .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[0].localeCompare(b[0]));
  }
  root.AtlasPractice = {records, record, dueEntries, persistent: () => persistent};
})(window);
