// DOM rendering for results. Browser-only. Pure-string builders plus a helper to
// open the first story. Event wiring lives in app.js, bound once to the persistent
// results container (re-binding per render would stack listeners).

import { esc, host, safeUrl } from './util.js';
import { tier, outlets, pickHeadline, sectionLabel, clusterKeyword } from './cluster.js';
import { extractFacts } from './facts.js';
import { verifyLinks } from './verify.js';

function bySrcTier(a, b) {
  const ta = tier(a.domain), tb = tier(b.domain);
  return ta === tb ? 0 : (ta === 'tier1' ? -1 : 1);
}

function renderSrcs(list) {
  return [...list].sort(bySrcTier).map(a => {
    const t = tier(a.domain);
    const badge = t === 'tier1' ? '<span class="tier-tag">Major</span>' : '';
    const syn = (a.syndicated > 1)
      ? `<span class="syn"> · also by ${a.syndicated - 1} other outlet${a.syndicated > 2 ? 's' : ''}</span>`
      : '';
    return `<a class="src ${t}" href="${esc(safeUrl(a.url || '#'))}" target="_blank" rel="noopener">
      <span class="src-out">${esc(host(a.domain))}${badge}</span>
      <span class="src-hed">${esc(a.title || '(no title)')}${syn}</span>
    </a>`;
  }).join('');
}

function renderStory(cluster, i, query) {
  const outletCount = outlets(cluster).size;
  const headline = pickHeadline(cluster);
  const keyword = clusterKeyword(cluster, query);
  const facts = extractFacts(cluster);
  const groups = verifyLinks(keyword);
  const isLead = i === 0;

  const metaBits = [
    `<b>${outletCount}</b> outlet${outletCount === 1 ? '' : 's'}`,
    'Last 48 hours'
  ];

  const factsHtml = facts.length
    ? '<ul class="facts">' + facts.map(f => `
        <li class="fact">
          <div class="fact-text">${esc(f.text)}</div>
          ${f.ctx ? `<div class="fact-ctx">&ldquo;${esc(f.ctx)}&rdquo;</div>` : ''}
          <div class="fact-check">→ <a href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener">${esc(f.linkText)}</a></div>
        </li>`).join('') + '</ul>'
    : '<p class="fact-ctx" style="margin-bottom:24px;">Nothing specific was extractable from these headlines. Use the verify links below.</p>';

  const verifyHtml = groups.map(g => `
    <div class="vgroup">
      <h4>${esc(g.name)}</h4>
      <ul class="vlist">
        ${g.links.map(([n, u]) => `<li><a class="vlink" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}
      </ul>
    </div>
  `).join('');

  const sorted = [...cluster].sort(bySrcTier);
  const top = sorted.slice(0, 8), rest = sorted.slice(8);
  const headId = 'story-hed-' + i;
  const bodyId = 'story-body-' + i;
  const moreId = 'more-src-' + i;

  return `
    <article class="story">
      <div class="story-section">${esc(sectionLabel(i, cluster))}</div>
      <h2><button class="story-hed${isLead ? ' lead' : ''}" id="${headId}" aria-expanded="false" aria-controls="${bodyId}">${esc(headline)}</button></h2>
      <div class="story-meta">${metaBits.join(' · ')}</div>
      <div class="story-body" id="${bodyId}" role="region" aria-labelledby="${headId}">
        ${factsHtml}
        <div class="verify">
          <div class="verify-label">Look it up · ${esc(keyword)}</div>
          <div class="vgroups">${verifyHtml}</div>
        </div>
        <div class="sources-label">Read it · ${outletCount} outlet${outletCount === 1 ? '' : 's'}</div>
        <div class="sources">${renderSrcs(top)}</div>
        ${rest.length ? `<button class="show-more" data-action="more" aria-expanded="false" aria-controls="${moreId}" data-count="${rest.length}">Show ${rest.length} more</button><div class="sources more-sources" id="${moreId}" hidden>${renderSrcs(rest)}</div>` : ''}
      </div>
    </article>
  `;
}

function renderFilters(state) {
  const opts = [['all', 'All'], ['tier1', 'Major only'], ['tier2', 'Other only']];
  return `
    <div class="filters">
      <span class="filter-label">Sources</span>
      ${opts.map(([v, l]) => `<button class="filter${state.filter === v ? ' on' : ''}" data-filter="${v}" aria-pressed="${state.filter === v}">${l}</button>`).join('')}
    </div>
  `;
}

export function renderResults(state) {
  const major = state.shown.filter(a => tier(a.domain) === 'tier1').length;
  const totalOutlets = outlets(state.shown).size;

  let badge;
  if (state.stale) badge = '<span class="src-badge warn">cached (offline)</span>';
  else if (state.source === 'GDELT') badge = '<span class="src-badge">GDELT</span>' + (state.cached ? ' <span class="src-badge">cached</span>' : '');
  else badge = '<span class="src-badge warn">Hacker News (backup)</span>';

  let html = `<div class="meta">
    <b>${state.shown.length}</b> articles from <b>${totalOutlets}</b> outlets`
    + (major ? ` · <b>${major}</b> from major outlets` : '')
    + ' ' + badge;

  if (state.clusters.length) {
    html += ` · <b>${state.clusters.length}</b> stor${state.clusters.length === 1 ? 'y' : 'ies'} about <em>${esc(state.query)}</em> · click any headline to expand`;
  } else {
    html += ' · No stories matched closely. Try simpler keywords or change the filter.';
  }
  html += '</div>';

  html += renderFilters(state);

  for (let i = 0; i < Math.min(state.clusters.length, 12); i++) {
    html += renderStory(state.clusters[i], i, state.query);
  }
  return html;
}

/** Open the first story after a render so results aren't all collapsed. */
export function openFirstStory(root) {
  const first = root.querySelector('.story');
  if (first) {
    first.classList.add('open');
    const hed = first.querySelector('.story-hed');
    if (hed) hed.setAttribute('aria-expanded', 'true');
  }
}
