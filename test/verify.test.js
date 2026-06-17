import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyLinks } from '../js/verify.js';

const names = groups => groups.map(g => g.name);

test('verifyLinks always includes Background, Government, and Research', () => {
  const n = names(verifyLinks('anything at all'));
  assert.ok(n.includes('Background'));
  assert.ok(n.includes('Government'));
  assert.ok(n.includes('Research'));
});

test('verifyLinks adds a topic group for disasters', () => {
  assert.ok(names(verifyLinks('earthquake in California')).includes('Weather & disasters'));
});

test('verifyLinks adds Markets for finance terms', () => {
  assert.ok(names(verifyLinks('federal reserve inflation')).includes('Markets'));
});

test('verifyLinks adds Health for medical terms', () => {
  assert.ok(names(verifyLinks('new vaccine outbreak')).includes('Health'));
});

test('verifyLinks omits topic groups for unrelated queries', () => {
  const n = names(verifyLinks('local bakery opening'));
  assert.ok(!n.includes('Weather & disasters'));
  assert.ok(!n.includes('Markets'));
  assert.ok(!n.includes('Health'));
});

test('verifyLinks URL-encodes the query', () => {
  const bg = verifyLinks('a b').find(g => g.name === 'Background');
  assert.ok(bg.links.every(([, u]) => !/\s/.test(u)));
});
