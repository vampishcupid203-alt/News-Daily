// Small pure helpers shared across modules. No DOM, no browser APIs.

import { STOPS } from './config.js';

/** Escape a string for safe insertion into HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/** Build a URL with an encoded query string. */
export function url(base, params) {
  const parts = Object.entries(params).map(
    ([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)
  );
  return base + '?' + parts.join('&');
}

/** Tokenize text into a Set of meaningful lowercase words (drops stopwords). */
export function tokens(text) {
  const out = new Set();
  const cleaned = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const w of cleaned.split(/\s+/)) {
    if (w.length > 2 && !STOPS.has(w)) out.add(w);
  }
  return out;
}

/**
 * GDELT inserts stray spaces around punctuation ("$1 . 75", "63 %", "deal ,
 * briefly"). Repair split numbers, then drop spaces that can never precede
 * punctuation in English. Display + extraction both run on the cleaned text.
 */
export function cleanTitle(title) {
  let s = String(title || ''), prev;
  do {
    prev = s;
    s = s.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2').replace(/(\d)\s*,\s*(\d)/g, '$1,$2');
  } while (s !== prev);
  s = s.replace(/\s+([%.,;:!?])/g, '$1');
  return s.replace(/\s+/g, ' ').trim();
}

/** Normalize a money string to a comparison key so "$1B" and "$1 billion" dedupe. */
export function moneyKey(amt) {
  return amt.replace(/\s+/g, '').toLowerCase()
    .replace('billion', 'b').replace('trillion', 't').replace('million', 'm').replace('bn', 'b');
}

/** Grab a short window of words around a match for quote context. */
export function nearby(text, match, idx) {
  const before = text.slice(0, idx).trim().split(/\s+/).slice(-4).join(' ');
  const after = text.slice(idx + match.length).trim().split(/\s+/).slice(0, 4).join(' ');
  return (before + ' ' + match + ' ' + after).trim().replace(/^[,.\s-]+|[,.\s-]+$/g, '');
}

/** Truncate a title at the first sentence boundary before `max`, else hard-cut. */
export function shorten(title, max) {
  const stop = title.search(/[.!?]/);
  return (stop > 0 && stop < max ? title.slice(0, stop) : title.slice(0, max)).trim();
}

/** Strip a leading "www." from a hostname for display. */
export function host(d) { return String(d || 'unknown').replace(/^www\./, ''); }

/**
 * Only allow http(s) URLs in href positions — network-derived links could carry a
 * `javascript:` (or other) scheme. Returns '#' for anything unsafe or unparseable.
 */
export function safeUrl(u) {
  if (!u) return '#';
  const base = typeof location !== 'undefined' ? location.href : 'https://example.invalid/';
  try {
    const p = new URL(String(u), base).protocol;
    return (p === 'http:' || p === 'https:') ? String(u) : '#';
  } catch {
    return '#';
  }
}
