import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tier, outlets, dedupe, cluster, rankClusters, pickHeadline, sectionLabel, clusterKeyword
} from '../js/cluster.js';

test('tier classifies majors, blocked, and other', () => {
  assert.equal(tier('www.BBC.com'), 'tier1');
  assert.equal(tier('reuters.com'), 'tier1');
  assert.equal(tier('rt.com'), 'blocked');
  assert.equal(tier('some-blog.xyz'), 'tier2');
});

test('dedupe drops blocked + junk and merges syndicated copies, preferring majors', () => {
  const out = dedupe([
    { domain: 'example.com', title: 'SpaceX launches Starship', url: 'e' },
    { domain: 'reuters.com', title: 'SpaceX launches Starship', url: 'r' },
    { domain: 'rt.com', title: 'Propaganda piece', url: 'x' },
    { domain: 'foo.com', title: 'Weather Today in Dallas', url: 'w' }
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].domain, 'reuters.com'); // major chosen as canonical
  assert.equal(out[0].url, 'r');
  assert.equal(out[0].syndicated, 2);
  assert.deepEqual([...out[0].domains].sort(), ['example.com', 'reuters.com']);
});

test('a heavily-syndicated single entry still counts as a multi-outlet story', () => {
  // After dedupe, identical-headline copies collapse to one entry that records
  // every contributing domain — so outlet breadth survives.
  const merged = dedupe([
    { domain: 'reuters.com', title: 'Big wire story', url: 'r' },
    { domain: 'apnews.com', title: 'Big wire story', url: 'a' },
    { domain: 'bbc.com', title: 'Big wire story', url: 'b' }
  ]);
  assert.equal(merged.length, 1);
  assert.equal(outlets(merged).size, 3);
});

test('cluster groups articles sharing keywords across >=2 domains', () => {
  const groups = cluster([
    { domain: 'a.com', title: 'Mars rover finds water ice' },
    { domain: 'b.com', title: 'Mars rover discovers water' },
    { domain: 'c.com', title: 'Stock market falls sharply' }
  ], 'space');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
});

test('rankClusters keeps clusters matching the query', () => {
  const c1 = [{ domain: 'a.com', title: 'Mars rover update' }, { domain: 'b.com', title: 'Mars mission news' }];
  const c2 = [{ domain: 'a.com', title: 'Cooking recipes' }, { domain: 'b.com', title: 'Cooking tips' }];
  const ranked = rankClusters([c2, c1], 'mars');
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0], c1);
});

test('pickHeadline prefers a major outlet headline', () => {
  const h = pickHeadline([
    { domain: 'some-blog.xyz', title: 'Tiny blog take' },
    { domain: 'reuters.com', title: 'Reuters authoritative headline' }
  ]);
  assert.equal(h, 'Reuters authoritative headline');
});

test('sectionLabel reflects coverage breadth', () => {
  assert.equal(sectionLabel(0, []), 'Top Story');
  const wide = Array.from({ length: 8 }, (_, i) => ({ domain: `o${i}.com` }));
  assert.equal(sectionLabel(1, wide), 'Widely Covered');
  assert.equal(sectionLabel(1, [{ domain: 'x.com' }, { domain: 'y.com' }]), 'Also Reported');
});

test('clusterKeyword surfaces a shared non-query term', () => {
  const kw = clusterKeyword([
    { title: 'Hurricane Helene hits Florida' },
    { title: 'Hurricane Helene path update' }
  ], 'storm');
  assert.ok(['hurricane', 'helene', 'florida', 'path', 'update', 'hits'].includes(kw));
});
