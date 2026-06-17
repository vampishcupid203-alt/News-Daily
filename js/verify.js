// Topic-aware verification links: official / primary sources to check a story
// against, grouped by category. Pure — no DOM.

export function verifyLinks(query) {
  const q = encodeURIComponent(query);
  const ql = query.toLowerCase();

  const groups = [
    { name: 'Background', links: [
      ['Wikipedia', 'https://en.wikipedia.org/wiki/Special:Search?search=' + q],
      ['Britannica', 'https://www.britannica.com/search?query=' + q],
      ['Google News', 'https://news.google.com/search?q=' + q]
    ] }
  ];

  if (/\b(weather|storm|hurricane|tornado|flood|earthquake|wildfire|disaster)\b/.test(ql)) {
    groups.push({ name: 'Weather & disasters', links: [
      ['NOAA / NWS', 'https://www.weather.gov'],
      ['USGS earthquakes', 'https://earthquake.usgs.gov/earthquakes/map/'],
      ['FEMA', 'https://www.fema.gov/disaster/current']
    ] });
  }
  if (/\b(stock|market|nasdaq|earnings|ipo|fed|federal reserve|inflation)\b/.test(ql)) {
    groups.push({ name: 'Markets', links: [
      ['SEC EDGAR', 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=' + q + '&type=&dateb=&owner=include&count=40'],
      ['FRED data', 'https://fred.stlouisfed.org/searchresults/?st=' + q],
      ['Yahoo Finance', 'https://finance.yahoo.com/lookup?s=' + q]
    ] });
  }
  if (/\b(health|disease|virus|vaccine|drug|fda|cdc|covid|outbreak)\b/.test(ql)) {
    groups.push({ name: 'Health', links: [
      ['CDC', 'https://www.cdc.gov/search/?q=' + q],
      ['PubMed', 'https://pubmed.ncbi.nlm.nih.gov/?term=' + q],
      ['Clinical trials', 'https://clinicaltrials.gov/search?term=' + q]
    ] });
  }

  // government / research — always present as fallback options
  groups.push({ name: 'Government', links: [
    ['.gov + .edu', 'https://www.google.com/search?q=' + q + '+site%3A.gov+OR+site%3A.edu'],
    ['Congress', 'https://www.congress.gov/quick-search/legislation?wordsPhrases=' + q],
    ['White House', 'https://www.whitehouse.gov/?s=' + q]
  ] });
  groups.push({ name: 'Research', links: [
    ['Google Scholar', 'https://scholar.google.com/scholar?q=' + q],
    ['JSTOR', 'https://www.jstor.org/action/doBasicSearch?Query=' + q]
  ] });

  return groups;
}
