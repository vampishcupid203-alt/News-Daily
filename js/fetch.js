// Network layer. Browser-only (uses fetch, AbortController, sessionStorage).
//
// Reliability strategy, since GDELT sends no CORS headers and public proxies are
// flaky: try the target directly (cheap optimism), then race every proxy in
// parallel and take the first that returns valid JSON OF THE EXPECTED SHAPE. Losing
// requests are aborted on the first win. Results are cached in sessionStorage, and a
// stale cache is served if a later fetch fails outright.

import { GDELT, HN, PROXIES, RETRIES, CACHE_TTL } from './config.js';
import { url } from './util.js';

const noop = () => {};

const isGdelt = d => d && typeof d === 'object' && (Array.isArray(d.articles) || Object.keys(d).length === 0);
const isHN = d => d && Array.isArray(d.hits);

/** User-supplied proxy (e.g. a self-hosted Cloudflare Worker), highest priority. */
function userProxy() {
  if (typeof window !== 'undefined' && typeof window.NEWS_TRACER_PROXY === 'string') {
    return window.NEWS_TRACER_PROXY.trim();
  }
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="news-tracer-proxy"]');
    if (meta && meta.content) return meta.content.trim();
  }
  return '';
}

/** A proxy override must be an http(s) URL, and can't be http on an https page. */
function isValidProxy(s) {
  try {
    const u = new URL(s.replace(/\{url\}/i, 'https://x.invalid/'));
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (typeof location !== 'undefined' && location.protocol === 'https:' && u.protocol === 'http:') return false;
    return true;
  } catch { return false; }
}

/** Ordered list of proxy URL builders, validated user override first. */
function proxyBuilders() {
  const builders = [...PROXIES];
  const custom = userProxy();
  if (custom) {
    if (isValidProxy(custom)) {
      // {url} (any case) → encoded target; otherwise the template is a prefix.
      builders.unshift(/\{url\}/i.test(custom)
        ? u => custom.replace(/\{url\}/i, encodeURIComponent(u))
        : u => custom + encodeURIComponent(u));
    } else if (typeof console !== 'undefined') {
      console.warn('[news tracer] ignoring invalid NEWS_TRACER_PROXY override:', custom);
    }
  }
  return builders;
}

/** Fetch one URL with a timeout (and optional external abort signal), parse + validate. */
async function fetchJsonFrom(reqUrl, ms, label, { signal, validate } = {}) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(reqUrl, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(label + ' → ' + res.status);
    const text = await res.text();
    if (!text) throw new Error(label + ' empty');
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error(label + ' non-JSON'); }
    if (validate && !validate(data)) throw new Error(label + ' bad shape');
    return data;
  } catch (e) {
    throw e.name === 'AbortError' ? new Error(label + ' timed out') : e;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/** Try direct first, then race all proxies; first valid-shape JSON wins, losers abort. */
export async function tryFetch(target, ms, validate) {
  try {
    return await fetchJsonFrom(target, Math.min(ms, 8000), 'direct', { validate });
  } catch { /* expected: GDELT has no CORS headers — fall through to proxies */ }

  const shared = new AbortController();
  const attempts = proxyBuilders().map((build, i) => {
    let reqUrl;
    try { reqUrl = build(target); }
    catch { return Promise.reject(new Error('proxy ' + i + ' build failed')); }
    return fetchJsonFrom(reqUrl, ms, 'proxy ' + i, { signal: shared.signal, validate });
  });

  try {
    return await Promise.any(attempts);
  } catch (agg) {
    const reasons = (agg && agg.errors ? agg.errors : [agg])
      .map(e => (e && e.message) || String(e)).join('; ');
    throw new Error('all proxies failed (' + reasons + ')');
  } finally {
    shared.abort();                              // cancel losing in-flight requests
    attempts.forEach(p => p && p.catch(noop));   // swallow their post-settle rejections
  }
}

export async function fetchGdelt(q, onProgress = noop) {
  const query = q + ' sourcelang:English';
  let lastErr;
  for (let i = 0; i < RETRIES.length; i++) {
    const [records, ms] = RETRIES[i];
    const target = url(GDELT, {
      query, mode: 'ArtList', maxrecords: String(records), format: 'json', timespan: '2d'
    });
    onProgress('Asking GDELT (try ' + (i + 1) + ' of ' + RETRIES.length + ')');
    try {
      const data = await tryFetch(target, ms, isGdelt);
      return {
        articles: Array.isArray(data?.articles) ? data.articles : [],
        source: 'GDELT'
      };
    } catch (e) {
      lastErr = e;
      if (i < RETRIES.length - 1) await new Promise(r => setTimeout(r, 300));
    }
  }
  throw lastErr || new Error('GDELT unreachable');
}

export async function fetchHN(q, onProgress = noop) {
  const since = Math.floor(Date.now() / 1000) - 48 * 3600;
  const target = url(HN, {
    query: q, tags: 'story',
    numericFilters: 'created_at_i>' + since,
    hitsPerPage: '50'
  });
  onProgress('Trying Hacker News');
  const data = await tryFetch(target, 10000, isHN);
  const hits = Array.isArray(data?.hits) ? data.hits : [];
  const articles = hits.filter(h => h.title && (h.url || h.story_url)).map(h => {
    const u = h.url || h.story_url;
    let domain = '';
    try { domain = new URL(u).hostname.replace(/^www\./, ''); } catch { /* leave blank */ }
    return { url: u, title: h.title, domain, sourcecountry: '' };
  });
  return { articles, source: 'Hacker News' };
}

// --- sessionStorage cache ----------------------------------------------------

const cacheKey = q => 'nt:' + q.toLowerCase().trim();

function cacheGet(q) {
  try {
    const raw = sessionStorage.getItem(cacheKey(q));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function cacheSet(q, payload) {
  try {
    sessionStorage.setItem(cacheKey(q), JSON.stringify({ ts: Date.now(), payload }));
  } catch { /* storage full or unavailable — caching is best-effort */ }
}

/**
 * Fetch articles for a query with caching and graceful degradation:
 *   GDELT → Hacker News → fresh cache → stale cache → throw.
 * Returns { articles, source, cached?, stale? }.
 */
export async function fetchArticles(q, onProgress = noop) {
  const hit = cacheGet(q);
  if (hit && Date.now() - hit.ts < CACHE_TTL && hit.payload?.articles?.length) {
    return { ...hit.payload, cached: true };
  }

  try {
    let result;
    try { result = await fetchGdelt(q, onProgress); }
    catch { result = await fetchHN(q, onProgress); }

    if (result.articles.length) cacheSet(q, result);
    return result;
  } catch (e) {
    // Live fetch failed entirely — fall back to a stale cache if we have one.
    if (hit && hit.payload?.articles?.length) {
      return { ...hit.payload, stale: true };
    }
    throw new Error("Couldn't reach GDELT or Hacker News. Try again in a minute.");
  }
}
