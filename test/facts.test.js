import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFacts } from '../js/facts.js';

const typesOf = facts => new Set(facts.map(f => f.type));

test('extractFacts pulls money, agency, and percentage from headlines', () => {
  const facts = extractFacts([
    { domain: 'reuters.com', title: 'FDA approves $2 billion drug deal', url: 'u1' },
    { domain: 'apnews.com', title: 'FDA approval sends shares up 5%', url: 'u2' }
  ]);
  const types = typesOf(facts);
  assert.ok(types.has('money'), 'expected a money fact');
  assert.ok(types.has('agency'), 'expected an agency fact');
  assert.ok(types.has('stat'), 'expected a percentage fact');

  const money = facts.find(f => f.type === 'money');
  assert.match(money.text, /\$2 billion/);
  const agency = facts.find(f => f.type === 'agency');
  assert.match(agency.text, /FDA/);
  assert.match(agency.url, /fda\.gov/);
});

test('extractFacts names titled people with a Wikipedia lookup', () => {
  const facts = extractFacts([
    { domain: 'reuters.com', title: 'President Biden signs spending bill', url: 'u1' }
  ]);
  const person = facts.find(f => f.type === 'person');
  assert.ok(person, 'expected a person fact');
  assert.match(person.text, /President Biden/);
  assert.match(person.url, /wikipedia\.org/);
});

test('extractFacts stops a titled name at the first verb (no over-capture)', () => {
  const facts = extractFacts([
    { domain: 'reuters.com', title: 'President Biden Visits Ukraine Today', url: 'u1' }
  ]);
  const person = facts.find(f => f.type === 'person');
  assert.equal(person.text, 'President Biden is named');
  assert.match(person.url, /search=Biden$/);
});

test('extractFacts does not emit an entity phrase containing a stopword', () => {
  const facts = extractFacts([
    { domain: 'a.com', title: 'Trump Will Meet Putin', url: 'u1' },
    { domain: 'b.com', title: 'Trump Will Meet Putin', url: 'u2' }
  ]);
  assert.ok(facts.every(f => !/\bWill\b/.test(f.text)), 'no fact should contain "Will"');
});

test('extractFacts caps output at six facts', () => {
  const facts = extractFacts([
    { domain: 'a.com', title: 'FDA EPA FBI CDC SEC DOJ FTC act on $1 billion 5% case', url: 'u' }
  ]);
  assert.ok(facts.length <= 6);
});

test('extractFacts dedupes equivalent money mentions', () => {
  const facts = extractFacts([
    { domain: 'a.com', title: 'Deal worth $3 billion announced', url: 'u1' },
    { domain: 'b.com', title: 'The $3 billion deal closes', url: 'u2' }
  ]);
  assert.equal(facts.filter(f => f.type === 'money').length, 1);
});
