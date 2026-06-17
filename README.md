# News Tracer

**See what's being reported, then check it yourself.**

News Tracer is a single-page, **keyless, fully client-side** news aggregator. Type a
topic and it pulls the top stories from the last 48 hours, clusters the syndicated
copies together, extracts the key facts (money figures, agencies, named people,
companies), and — most importantly — links every fact back to its source and gives
you primary/official sources to verify the broader story against.

No build step. No API keys. No server. It runs as static files and deploys to
GitHub Pages for free.

> A hundred outlets agreeing on something doesn't make it true. The links take you
> to the original — that's where verification actually happens.

---

## How it works

1. **Fetch** — queries [GDELT](https://www.gdeltproject.org/) (a free, global,
   key-less news index), with [Hacker News](https://hn.algolia.com/api) as a backup.
2. **Dedupe** — drops low-credibility and templated-junk sources, then merges
   syndicated copies of the same headline, preferring a major outlet as the canonical link.
3. **Cluster** — groups articles that cover the same event by shared keywords
   (union-find over title tokens), requiring 2+ outlets per story.
4. **Rank** — orders stories by how well they match your query, then by breadth of coverage.
5. **Extract** — surfaces money amounts, percentages, government agencies, titled
   people, and companies from the headlines, each with a verification link.
6. **Verify** — offers topic-aware links to primary sources (NOAA/USGS for disasters,
   SEC/FRED for markets, CDC/PubMed for health, plus Wikipedia, Congress, Scholar…).

### Reliability

GDELT doesn't send CORS headers, so a browser can't call it directly. News Tracer
tries the API directly (cheap optimism), then **races several public CORS proxies in
parallel** and takes the first that returns valid JSON. Results are cached in
`sessionStorage` for 10 minutes, and a **stale cache is served if a live fetch fails**,
so a flaky proxy degrades gracefully instead of erroring out.

Public proxies still rate-limit and go down. For rock-solid fetching, **host your own
proxy** (see below) — it's the single biggest reliability upgrade and keeps the app
key-less and static.

---

## Run locally

ES modules don't load over `file://`, so use the included zero-dependency dev server:

```bash
npm run dev
# → http://localhost:8080
```

(Any static server works — e.g. `npx serve` or `python -m http.server`.)

## Test

Pure logic (clustering, fact extraction, verification links, utilities) is unit-tested
with Node's built-in runner — no dependencies to install:

```bash
npm test
```

---

## Deploy

### GitHub Pages (included)

Push to `main`. The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
publishes the site automatically. In your repo: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. That's it — no build, no secrets.

### Optional: your own CORS proxy (recommended for reliability)

Deploy a tiny proxy and point the app at it. The app will use it first and fall back
to the public proxies if it's unavailable. Two ways to wire it in:

```html
<!-- in index.html <head> -->
<meta name="news-tracer-proxy" content="https://your-worker.example.workers.dev/?url={url}">
```

```js
// or at runtime, before app.js loads
window.NEWS_TRACER_PROXY = 'https://your-worker.example.workers.dev/?url={url}';
```

`{url}` is replaced with the URL-encoded target; if you omit `{url}`, the encoded
target is appended to the end of your string.

Example **Cloudflare Worker** (free tier):

```js
export default {
  async fetch(request) {
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return new Response('missing ?url=', { status: 400 });
    const upstream = await fetch(target, { headers: { 'User-Agent': 'news-tracer' } });
    const body = await upstream.text();
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
};
```

---

## Project layout

```text
index.html              # markup + font/CSS links; loads js/app.js as a module
css/styles.css          # all styles (newspaper aesthetic)
js/
  config.js             # constants & reference data (sources, agencies, regexes) — pure
  util.js               # esc, tokenize, money/title helpers — pure
  cluster.js            # tier, dedupe, cluster, rank, headline/keyword picks — pure
  facts.js              # fact extraction from headlines — pure
  verify.js             # topic-aware verification links — pure
  fetch.js              # hardened GDELT/HN fetch, proxy race, caching — browser
  render.js             # results HTML + delegated event wiring — browser
  app.js                # state, search orchestration, init — browser
test/                   # node --test suites for the pure modules
tools/serve.js          # zero-dependency local dev server
.github/workflows/      # test CI + GitHub Pages deploy
```

The `pure` modules contain no DOM or network access, which is why they're directly
unit-testable in Node.

---

## Limitations (honest)

- **GDELT covers broad/global news well** but is weaker on hyper-local or very fresh
  (< ~15 min) stories. Hacker News backup skews tech.
- **Fact extraction is heuristic** (regex over headlines), not NLP — it can miss
  things or surface a stray match. Every fact links to its source so you can check.
- **Public proxies are the weak link.** Host your own (above) for production-grade reliability.
- English-language sources only (`sourcelang:English`).

## License

[MIT](LICENSE).
Data via [GDELT](https://www.gdeltproject.org/) and [Hacker News](https://hn.algolia.com/api).
