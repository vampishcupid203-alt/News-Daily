// Story clustering: dedupe syndicated copies, group articles that cover the same
// event by shared keywords, and rank the groups by relevance to the query.
// Pure — no DOM.

import { MAJORS, BLOCKED, JUNK_TITLE } from './config.js';
import { tokens, cleanTitle } from './util.js';

/** Classify a domain: blocked / tier1 (major outlet) / tier2 (everything else). */
export function tier(d) {
  d = String(d || '').toLowerCase().replace(/^www\./, '');
  if (BLOCKED.has(d)) return 'blocked';
  return MAJORS.has(d) ? 'tier1' : 'tier2';
}

/** Distinct outlets in a cluster, counting domains merged during dedupe. */
export function outlets(cluster) {
  const s = new Set();
  for (const a of cluster) {
    if (a.domains) for (const d of a.domains) s.add(d);
    else if (a.domain) s.add(a.domain);
  }
  return s;
}

/** Drop blocked sources + junk titles, then merge syndicated copies by title. */
export function dedupe(articles) {
  const ok = articles.filter(a => tier(a.domain) !== 'blocked' && !JUNK_TITLE.test(a.title || ''));

  const byTitle = new Map();
  for (const a of ok) {
    const key = String(a.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, {
        ...a,
        title: cleanTitle(a.title),
        domains: new Set(a.domain ? [a.domain] : []),
        syndicated: 1
      });
    } else {
      // prefer a major outlet as the canonical link
      if (tier(a.domain) === 'tier1' && tier(existing.domain) !== 'tier1') {
        existing.url = a.url;
        existing.domain = a.domain;
      }
      if (a.domain) existing.domains.add(a.domain);
      existing.syndicated++;
    }
  }
  return [...byTitle.values()];
}

/** Build clusters of articles sharing keywords (union-find over title tokens). */
export function cluster(articles, query) {
  const n = articles.length;
  if (!n) return [];

  // tokenize titles but strip query words — otherwise every result shares them
  const queryStops = new Set([...tokens(query)]);
  const titleTokens = articles.map(a => {
    const t = new Set();
    for (const w of tokens(a.title)) if (!queryStops.has(w)) t.add(w);
    return t;
  });

  const index = new Map();
  for (let i = 0; i < n; i++) {
    for (const t of titleTokens[i]) {
      if (!index.has(t)) index.set(t, []);
      index.get(t).push(i);
    }
  }

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const join = (x, y) => { const rx = find(x), ry = find(y); if (rx !== ry) parent[rx] = ry; };

  // tokens shared by too many articles cluster everything together — skip them
  const ceiling = Math.max(2, Math.floor(n * 0.3));
  for (const [, idxs] of index) {
    if (idxs.length < 2 || idxs.length > ceiling) continue;
    for (let i = 1; i < idxs.length; i++) join(idxs[0], idxs[i]);
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    if (!titleTokens[i].size) continue;
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(articles[i]);
  }

  // Keep groups covered by >=2 distinct outlets. A single heavily-syndicated entry
  // counts too, since dedupe records every contributing domain in `domains`.
  return [...groups.values()].filter(g => outlets(g).size >= 2);
}

/** Rank clusters: query match first, then outlet breadth, then size. */
export function rankClusters(clusters, query) {
  const qWords = tokens(query);
  if (!qWords.size) return clusters;

  return clusters
    .map(c => {
      let hits = 0;
      for (const a of c) {
        const titleT = tokens(a.title);
        for (const w of qWords) if (titleT.has(w)) { hits++; break; }
      }
      return {
        cluster: c,
        match: hits / c.length,
        outlets: outlets(c).size
      };
    })
    .filter(s => s.match >= 0.5)
    .sort((a, b) => {
      if (Math.abs(b.match - a.match) > 0.1) return b.match - a.match;
      if (b.outlets !== a.outlets) return b.outlets - a.outlets;
      return b.cluster.length - a.cluster.length;
    })
    .map(s => s.cluster);
}

/** Pick a representative (not-too-long, not-too-short) headline, preferring majors. */
export function pickHeadline(cluster) {
  const majors = cluster.filter(a => tier(a.domain) === 'tier1');
  const pool = (majors.length ? majors : cluster).map(a => a.title).filter(Boolean);
  if (!pool.length) return '(no headline)';
  const sorted = [...pool].sort((a, b) => a.length - b.length);
  return sorted[Math.floor(sorted.length * 0.4)];
}

/** Section label by coverage breadth. */
export function sectionLabel(i, cluster) {
  if (i === 0) return 'Top Story';
  const count = outlets(cluster).size;
  if (count >= 8) return 'Widely Covered';
  if (count >= 4) return 'Of Note';
  return 'Also Reported';
}

/** The keyword that best characterizes a cluster (for the "look it up" links). */
export function clusterKeyword(cluster, query) {
  const queryStops = new Set([...tokens(query)]);
  const counts = new Map();
  for (const a of cluster) {
    for (const t of tokens(a.title)) {
      if (!queryStops.has(t)) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  const threshold = Math.ceil(cluster.length * 0.4);
  const candidates = [...counts.entries()]
    .filter(([, n]) => n >= threshold)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  return candidates.length ? candidates[0][0] : query;
}
