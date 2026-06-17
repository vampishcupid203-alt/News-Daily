# OpenAI Open-Source Credits — Application

> Draft application text for News Tracer. Optional file; delete if you don't want it in the repo.

## Why this project qualifies

News Tracer is a free, open-source (MIT), zero-key, fully static news-literacy tool that
does something the ad-driven web actively avoids: it hands readers the primary sources and
dares them to verify. Type any topic and it pulls the last 48 hours of global coverage from
GDELT, clusters the syndicated copies, extracts the concrete claims — dollar figures,
agencies, named officials, percentages — and links every one back to its origin alongside
official primary sources (SEC, CDC, NOAA, Congress, Wikipedia). No tracking, no paywall, no
API keys, no server: it deploys to GitHub Pages for nothing and runs indefinitely. This is
exactly the public-interest infrastructure an open-source program exists to amplify — a
transparent, auditable, education-first project (unit-tested pure logic, documented
architecture, reproducible setup) that fights misinformation by turning verification into a
one-click habit instead of a research skill. The codebase is small, legible, and
contribution-ready, so credits compound into durable public value rather than disappearing
into a closed product. Backing it advances media literacy, source transparency, and
responsible AI — and every improvement ships straight back to the commons under MIT.

## How I will use the API credits

Credits would fund both development and an optional, privacy-respecting AI layer. I'll use
the API and Codex to (1) harden the codebase — expand test coverage, ship a self-hostable
fetch proxy, and replace the regex fact-extractor with a model-driven claim extractor; and
(2) build an opt-in enrichment service whose keys live server-side and never touch the public
repo. That service would write neutral one-paragraph summaries of each story cluster, extract
and normalize factual claims, flag where outlets disagree (cross-source contradiction
detection), and surface the single strongest primary source to check each claim against.
Usage is naturally bounded — one cached summarization per displayed story — so credits convert
directly into reader-facing value instead of runaway spend.

## Anything else worth knowing

The project is intentionally key-less and static so anyone can clone and run it at zero cost
and with no secrets; any AI features stay strictly optional and server-side (or
user-supplied-key), so no credentials ever land in the public repository. It's MIT-licensed,
already unit-tested, CI-enabled, and documented end to end. I'm committed to attributing
OpenAI, publishing usage and impact transparently, and keeping every credit-funded improvement
open source. The roadmap, issues, and metrics will be public so the grant's impact is fully
auditable.
