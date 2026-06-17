// Fact extraction: pull money figures, percentages, agencies, named people,
// companies, and recurring proper nouns out of a cluster's headlines, each with
// a link to verify it. Pure — no DOM.

import {
  AGENCIES, COUNTRIES, BAD_PHRASES, COMPANY_SFX, PERSON_PFX, NOT_ENTITY
} from './config.js';
import { cleanTitle, moneyKey, nearby, shorten } from './util.js';

function classify(noun) {
  if (PERSON_PFX.test(noun)) return 'person';
  if (COMPANY_SFX.test(noun)) return 'company';
  if (COUNTRIES.has(noun)) return 'country';
  return 'entity';
}

// Matches runs of 2–4 consecutive Title-Case words.
const PROPER = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g;

// Title Case sweeps verbs/prepositions ("Trump Will Meet Putin") into a proper-noun
// match. Split such a phrase into runs of >=2 words containing no stopword/verb, so a
// real entity survives instead of the whole phrase being dropped or mis-captured.
function entityRuns(phrase) {
  const runs = [];
  let cur = [];
  for (const w of phrase.split(/\s+/)) {
    if (NOT_ENTITY.test(w)) { if (cur.length >= 2) runs.push(cur.join(' ')); cur = []; }
    else cur.push(w);
  }
  if (cur.length >= 2) runs.push(cur.join(' '));
  return runs;
}

export function extractFacts(cluster) {
  const facts = [];
  const seen = new Map();

  // count how often each proper-noun run appears — drops one-off fragments
  const nounCounts = new Map();
  for (const a of cluster) {
    const phrases = String(a.title || '').match(PROPER) || [];
    for (const ph of phrases) {
      for (const run of entityRuns(ph)) nounCounts.set(run, (nounCounts.get(run) || 0) + 1);
    }
  }

  const add = (key, fact) => {
    if (seen.has(key)) return;
    seen.set(key, fact);
    facts.push(fact);
  };

  for (const a of cluster) {
    const title = cleanTitle(a.title);

    // money
    const moneyRe = /\$\s?\d[\d,]*(?:\.\d+)?\s?(?:million|billion|trillion|m|b|k|bn|t)?\b/gi;
    let m;
    while ((m = moneyRe.exec(title)) !== null) {
      const amt = m[0].replace(/\s+/g, ' ').trim();
      add('money:' + moneyKey(amt), {
        type: 'money',
        text: amt + ' is mentioned',
        ctx: nearby(title, amt, m.index),
        url: a.url,
        linkText: 'read the ' + a.domain + ' article'
      });
    }

    // percentages
    const pctRe = /\b(\d+(?:\.\d+)?\s?%)/g;
    while ((m = pctRe.exec(title)) !== null) {
      const pct = m[1].trim();
      add('pct:' + pct.replace(/\s+/g, ''), {
        type: 'stat',
        text: pct + ' is mentioned',
        ctx: nearby(title, pct, m.index),
        url: a.url,
        linkText: 'read the ' + a.domain + ' article'
      });
    }

    // agencies
    const acroRe = /\b([A-Z]{2,6})\b/g;
    while ((m = acroRe.exec(title)) !== null) {
      const ag = AGENCIES[m[1]];
      if (!ag) continue;
      add('ag:' + m[1], {
        type: 'agency',
        text: m[1] + ' (' + ag.name + ') is involved',
        ctx: shorten(title, 100),
        url: ag.url,
        linkText: 'press releases from ' + ag.name
      });
    }

    // titled people — capture the name, then stop at the first verb/stopword so a
    // Title-Case headline ("President Biden Visits Ukraine") doesn't swallow the rest.
    const personRe = /(President|Senator|Sen\.|Rep\.|Dr\.|Gov\.|Sec\.|Secretary|Mayor|Judge|Justice|Prime Minister|King|Queen|CEO|Chairman)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g;
    while ((m = personRe.exec(title)) !== null) {
      const kept = [];
      for (const w of m[2].split(/\s+/)) {
        if (NOT_ENTITY.test(w)) break;
        kept.push(w);
      }
      if (!kept.length) continue;
      const lookup = kept.join(' ');
      const display = m[1] + ' ' + lookup;
      add('p:' + display.toLowerCase(), {
        type: 'person',
        text: display + ' is named',
        ctx: shorten(title, 100),
        url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(lookup),
        linkText: 'look up ' + lookup + ' on Wikipedia'
      });
    }

    // companies with corporate suffix
    const coRe = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Inc|Corp|Corporation|Ltd|LLC|Co\.|Group|Holdings|Plc|Pharmaceuticals|Pharma)\b\.?/g;
    while ((m = coRe.exec(title)) !== null) {
      const name = m[0].trim();
      const clean = name.replace(COMPANY_SFX, '').trim();
      add('co:' + clean.toLowerCase(), {
        type: 'company',
        text: name + ' is named',
        ctx: shorten(title, 100),
        url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=' + encodeURIComponent(clean) + '&type=&dateb=&owner=include&count=40',
        linkText: 'SEC filings for ' + clean
      });
    }

    // other proper nouns — split over-captured phrases, keep recurring multi-word runs
    PROPER.lastIndex = 0;
    while ((m = PROPER.exec(title)) !== null) {
      for (const noun of entityRuns(m[0])) {
        if (PERSON_PFX.test(noun)) continue;
        if (COMPANY_SFX.test(noun)) continue;
        if (BAD_PHRASES.has(noun)) continue;
        if ((nounCounts.get(noun) || 0) < 2) continue;

        const kind = classify(noun);
        const refUrl = kind === 'country'
          ? 'https://www.cia.gov/the-world-factbook/?search=' + encodeURIComponent(noun)
          : 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(noun);
        const refText = kind === 'country'
          ? 'World Factbook: ' + noun
          : 'Wikipedia: ' + noun;
        add(kind + ':' + noun.toLowerCase(), {
          type: kind,
          text: noun + ' is named',
          ctx: shorten(title, 100),
          url: refUrl,
          linkText: refText
        });
      }
    }
  }

  const priority = { money: 6, stat: 5, agency: 5, person: 4, company: 3, country: 2, entity: 1 };
  facts.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0));
  return facts.slice(0, 6);
}
