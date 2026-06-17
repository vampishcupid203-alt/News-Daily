// Application entry point: state, search orchestration, and wiring. Browser-only.

import { fetchArticles } from './fetch.js';
import { dedupe, cluster, rankClusters, tier } from './cluster.js';
import { renderResults, openFirstStory } from './render.js';
import { esc } from './util.js';

const $ = id => document.getElementById(id);

const state = {
  raw: [],
  shown: [],
  clusters: [],
  query: '',
  source: '',
  filter: 'all',
  cached: false,
  stale: false
};

/** Short, polite message for screen readers (the visible UI carries the detail). */
function announce(msg) {
  const el = $('sr-status');
  if (el) el.textContent = msg;
}

function renderAll() {
  const out = $('out');
  out.innerHTML = renderResults(state);
  openFirstStory(out);
}

function applyFilter() {
  let pool = state.raw;
  if (state.filter === 'tier1') pool = pool.filter(a => tier(a.domain) === 'tier1');
  else if (state.filter === 'tier2') pool = pool.filter(a => tier(a.domain) === 'tier2');

  state.shown = pool;
  state.clusters = rankClusters(cluster(pool, state.query), state.query);
  renderAll();
  announce(`${state.shown.length} articles, ${state.clusters.length} ${state.clusters.length === 1 ? 'story' : 'stories'} about ${state.query}`);
}

function setStatus(main, hint) {
  $('out').innerHTML = `<div class="status">${esc(main)} <span class="typing"></span>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  announce(main);
}

async function search(query) {
  const btn = $('btn');
  btn.disabled = true;
  btn.textContent = 'Loading…';

  state.query = query;
  state.filter = 'all';
  state.cached = false;
  state.stale = false;

  setStatus('Searching the news', 'GDELT can be slow — give it 10 to 30 seconds');

  try {
    const { articles, source, cached, stale } = await fetchArticles(query, msg => setStatus(msg, ''));

    if (!articles.length) {
      $('out').innerHTML = `<div class="status">Nothing came up for <b>"${esc(query)}"</b> in the last 48 hours. Try simpler keywords.</div>`;
      announce(`No results for ${query}`);
      return;
    }

    state.source = source;
    state.cached = !!cached;
    state.stale = !!stale;
    state.raw = dedupe(articles);
    applyFilter();
  } catch (e) {
    console.error('[news tracer]', e);
    const retry = `<div style="margin-top:14px"><button class="filter on" data-action="retry" data-q="${esc(query)}">Try again</button></div>`;
    $('out').innerHTML = `<div class="status err"><b>Something went wrong:</b> ${esc(e.message || String(e))}${retry}</div>`;
    announce('Something went wrong. ' + (e.message || ''));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Search';
  }
}

// One delegated handler on the persistent results container. Binding it once (rather
// than per render) is what keeps clicks from firing N times after re-renders.
function handleResultsClick(e) {
  const hed = e.target.closest('.story-hed');
  if (hed) {
    const story = hed.closest('.story');
    const open = story.classList.toggle('open');
    hed.setAttribute('aria-expanded', String(open));
    return;
  }

  const more = e.target.closest('[data-action="more"]');
  if (more) {
    const panel = document.getElementById(more.getAttribute('aria-controls'));
    const expanded = more.getAttribute('aria-expanded') === 'true';
    if (panel) panel.hidden = expanded;
    more.setAttribute('aria-expanded', String(!expanded));
    more.textContent = expanded ? `Show ${more.dataset.count} more` : 'Show fewer';
    return;
  }

  const filter = e.target.closest('[data-filter]');
  if (filter) {
    state.filter = filter.dataset.filter;
    applyFilter();
    const active = $('out').querySelector(`.filter[data-filter="${state.filter}"]`);
    if (active) active.focus(); // re-render replaced the button the user just activated
    return;
  }

  const retry = e.target.closest('[data-action="retry"]');
  if (retry) search(retry.dataset.q);
}

function init() {
  $('date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  document.querySelectorAll('.pick').forEach(p => {
    p.addEventListener('click', () => { $('q').value = p.dataset.q; $('form').requestSubmit(); });
  });

  $('form').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('q').value.trim();
    if (q.length >= 2) search(q);
  });

  $('out').addEventListener('click', handleResultsClick);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
