import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, url, tokens, cleanTitle, moneyKey, shorten, host, safeUrl } from '../js/util.js';

test('esc neutralizes HTML metacharacters', () => {
  assert.equal(esc('<script>"x"&\'</script>'),
    '&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('url encodes keys and values', () => {
  assert.equal(url('https://x.test', { q: 'a b', n: 5 }), 'https://x.test?q=a%20b&n=5');
});

test('tokens drops stopwords and short words, lowercases', () => {
  const t = tokens('The SpaceX Starship is GO');
  assert.ok(t.has('spacex'));
  assert.ok(t.has('starship'));
  assert.ok(!t.has('the'));
  assert.ok(!t.has('is'));
  assert.ok(!t.has('go')); // 2 chars
});

test('cleanTitle repairs split numbers', () => {
  assert.equal(cleanTitle('Deal worth $1 . 75 billion'), 'Deal worth $1.75 billion');
  assert.equal(cleanTitle('Over 1 , 000 jobs'), 'Over 1,000 jobs');
});

test('cleanTitle removes stray spaces before punctuation', () => {
  assert.equal(cleanTitle('Stock jumps 63 % today'), 'Stock jumps 63% today');
  assert.equal(cleanTitle('Valuation to $2 . 6T , briefly'), 'Valuation to $2.6T, briefly');
  assert.equal(cleanTitle('Here is why .'), 'Here is why.');
});

test('moneyKey normalizes equivalent amounts', () => {
  assert.equal(moneyKey('$2 billion'), moneyKey('$2billion'));
  assert.equal(moneyKey('$2bn'), '$2b');
});

test('shorten cuts at sentence boundary or max', () => {
  assert.equal(shorten('Hello world. More text', 100), 'Hello world');
  assert.equal(shorten('No punctuation here at all', 5), 'No pu');
});

test('host strips www', () => {
  assert.equal(host('www.bbc.com'), 'bbc.com');
  assert.equal(host(''), 'unknown');
});

test('safeUrl blocks non-http(s) schemes', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('data:text/html,<script>'), '#');
  assert.equal(safeUrl('https://example.com/x'), 'https://example.com/x');
  assert.equal(safeUrl('http://example.com'), 'http://example.com');
  assert.equal(safeUrl(''), '#');
});
