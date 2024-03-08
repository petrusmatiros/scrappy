const { runScraper, WAIT_EVENTS, BROWSER_RESOURCE_TYPES } = require('./scraper');

const scrapingOptions = {
  benchmark: true,
  metrics: true,
  logResults: false,
  waitUntil: WAIT_EVENTS.DOMCONTENTLOADED,
  allowedResources: null,
  scrapingFunction: () => {
    const selected = document.querySelectorAll('tbody a');
    const data = []
    for (let i = 0; i < selected.length; i++) {
      if (selected[i].href) {
        data.push(selected[i].href);
      }
    }
    return data.length ? data : null;
  },
  checkErrors: false,
  whatStringToReplace: null,
  replaceWithString: null,
  jsonInputFile: 'sitemaps',
  jsonOutputFile: 'urls',
};

runScraper(scrapingOptions);