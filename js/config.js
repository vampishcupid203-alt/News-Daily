// Static configuration and reference data. No DOM, no browser APIs — safe to
// import in Node for testing.

export const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';
export const HN = 'https://hn.algolia.com/api/v1/search';

// Public CORS proxies, raced in parallel (first valid JSON wins). They rate-limit
// and go down, so we keep several. NOTE (2026): corsproxy.io requires an API key on
// non-dev origins, and thingproxy truncates bodies over ~100KB — both are kept only
// as long shots behind codetabs/allorigins. For reliable fetching, host your own proxy
// and point at it with <meta name="news-tracer-proxy" content="...{url}..."> or
// window.NEWS_TRACER_PROXY (see README). The {url} placeholder is replaced with the
// encoded target; a builder without {url} has the encoded target appended.
export const PROXIES = [
  u => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?url=' + encodeURIComponent(u), // dev/localhost origins only
  u => 'https://thingproxy.freeboard.io/fetch/' + u          // truncates >100KB; last resort
];

// [maxrecords, timeoutMs] per attempt. Shrink the result set and tighten the
// timeout on each retry so a slow GDELT still has a chance to answer with less.
export const RETRIES = [[75, 15000], [50, 12000], [25, 10000]];

// How long a successful result stays cached (sessionStorage), in ms.
export const CACHE_TTL = 10 * 60 * 1000;

// curated list — wire services, broadsheets of record, major broadcasters
export const MAJORS = new Set([
  'reuters.com', 'apnews.com', 'ap.org', 'afp.com', 'bloomberg.com',
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'usatoday.com', 'latimes.com',
  'npr.org', 'pbs.org', 'politico.com', 'axios.com', 'propublica.org',
  'theatlantic.com', 'time.com', 'cnn.com', 'nbcnews.com', 'abcnews.go.com',
  'cbsnews.com', 'foxnews.com', 'newyorker.com', 'vox.com', 'businessinsider.com',
  'cnbc.com', 'msnbc.com', 'bostonglobe.com', 'seattletimes.com',
  'bbc.com', 'bbc.co.uk', 'theguardian.com', 'thetimes.co.uk', 'ft.com',
  'telegraph.co.uk', 'independent.co.uk', 'rte.ie', 'economist.com',
  'lemonde.fr', 'lefigaro.fr', 'spiegel.de', 'zeit.de', 'sueddeutsche.de',
  'elpais.com', 'corriere.it', 'repubblica.it', 'nrc.nl', 'volkskrant.nl',
  'dw.com', 'france24.com',
  'nikkei.com', 'asahi.com', 'mainichi.jp', 'japantimes.co.jp', 'scmp.com',
  'thehindu.com', 'timesofindia.indiatimes.com', 'indianexpress.com',
  'abc.net.au', 'smh.com.au', 'theage.com.au', 'straitstimes.com',
  'aljazeera.com', 'jpost.com', 'haaretz.com', 'timesofisrael.com',
  'cbc.ca', 'theglobeandmail.com', 'thestar.com', 'nationalpost.com',
  'theverge.com', 'wired.com', 'arstechnica.com', 'techcrunch.com', 'spaceflightnow.com',
  'forbes.com', 'fortune.com'
]);

export const BLOCKED = new Set([
  'breitbart.com', 'rt.com', 'sputniknews.com', 'tass.com',
  'thegatewaypundit.com', 'infowars.com', 'naturalnews.com', 'zerohedge.com',
  'pakobserver.net'
]);

// templated junk that floods searches for generic terms
export const JUNK_TITLE = /\b(Weather (Today|Update|Forecast|Report|Alert|Watch|Warning|Advisory|Outlook)|Today'?s? Weather|UV Index|Mostly (Sunny|Cloudy)|Partly (Sunny|Cloudy)|Hourly Forecast|10[\s-]?Day Forecast)\b/i;

export const STOPS = new Set('the a an and or but in on at to for of with by from as is was are were be been have has had will would can could should that this these those it its they them their there here he she his her we us our you your says said about into over under new news report years year days week month one two three out off back among both any all such most some many other today yesterday tomorrow tonight breaking top latest update live first last'.split(' '));

export const AGENCIES = {
  FDA: { name: 'the FDA', url: 'https://www.fda.gov/news-events/press-announcements' },
  EPA: { name: 'the EPA', url: 'https://www.epa.gov/newsreleases/search' },
  FBI: { name: 'the FBI', url: 'https://www.fbi.gov/news/press-releases' },
  CDC: { name: 'the CDC', url: 'https://www.cdc.gov/media/index.html' },
  WHO: { name: 'the WHO', url: 'https://www.who.int/news' },
  SEC: { name: 'the SEC', url: 'https://www.sec.gov/news/pressreleases' },
  DOJ: { name: 'the DOJ', url: 'https://www.justice.gov/news' },
  FTC: { name: 'the FTC', url: 'https://www.ftc.gov/news-events/news/press-releases' },
  FCC: { name: 'the FCC', url: 'https://www.fcc.gov/news-events/headlines' },
  NASA: { name: 'NASA', url: 'https://www.nasa.gov/news/' },
  NOAA: { name: 'NOAA', url: 'https://www.noaa.gov/news' },
  NIH: { name: 'NIH', url: 'https://www.nih.gov/news-events/news-releases' },
  IRS: { name: 'the IRS', url: 'https://www.irs.gov/newsroom' },
  FAA: { name: 'the FAA', url: 'https://www.faa.gov/newsroom/press-releases' },
  IMF: { name: 'the IMF', url: 'https://www.imf.org/en/News' },
  NATO: { name: 'NATO', url: 'https://www.nato.int/cps/en/natohq/news.htm' },
  OPEC: { name: 'OPEC', url: 'https://www.opec.org/opec_web/en/press_room/28.htm' },
  EU: { name: 'the EU', url: 'https://ec.europa.eu/commission/presscorner/home/en' },
  ECB: { name: 'the ECB', url: 'https://www.ecb.europa.eu/press/pr/html/index.en.html' }
};

export const COUNTRIES = new Set(['United States', 'America', 'Canada', 'Mexico', 'Brazil', 'United Kingdom', 'Britain', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 'Ukraine', 'China', 'Japan', 'South Korea', 'North Korea', 'India', 'Pakistan', 'Iran', 'Iraq', 'Israel', 'Turkey', 'Saudi Arabia', 'Egypt', 'Nigeria', 'South Africa', 'Australia', 'New Zealand', 'Indonesia', 'Philippines', 'Vietnam', 'Thailand', 'Singapore', 'Malaysia', 'Taiwan', 'Hong Kong']);

export const BAD_PHRASES = new Set(['Last Week', 'Last Year', 'Last Month', 'Last Night', 'This Week', 'This Year', 'This Month', 'New York Times', 'Washington Post', 'Wall Street Journal', 'Associated Press', 'White House', 'Top Story', 'Breaking News', 'Live Updates', 'Read More', 'In Photos', 'Getty Images', 'Bloomberg News', 'AP News', 'Fox News', 'CBS News', 'ABC News', 'NBC News']);

export const COMPANY_SFX = /\b(?:Inc|Corp|Corporation|Ltd|LLC|Co\.|Group|Holdings|Plc|Pharmaceuticals|Pharma|Bank)\b\.?$/i;
export const PERSON_PFX = /^(?:President|Senator|Sen\.|Rep\.|Dr\.|Gov\.|Sec\.|Secretary|Mayor|Judge|Justice|Prime Minister|King|Queen|CEO|Chairman)\s+/;
// Words that, capitalized, sneak into Title-Case headlines but are never entities —
// used both to reject and to split over-captured proper-noun phrases.
export const NOT_ENTITY = /\b(?:Billion|Million|Trillion|Will|Has|Have|Had|Says|Said|Gets?|Sells?|Buys?|Plans?|Falls?|Rises?|Hits?|Visits?|Meets?|Rules?|Signs?|Opens?|Wins?|Backs?|Calls?|Urges?|Warns?|Vows?|Names?|Picks?|Sees|Eyes|Sets?|Holds?|Leads?|Joins?|Quits?|Faces?|Seeks?|Wants?|Adds?|Cuts?|Bans?|Sues?|Files?|Slams?|Touts?|Unveils?|Launches|Reveals?|Announces|Reports?|Tops?|Drops?|Surges?|Slides?|Jumps?|Soars?|At|On|In|Of|To|For|With|And|Or|But|Today|Yesterday|Tomorrow)\b/;
