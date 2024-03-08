const { runScraper, WAIT_EVENTS, BROWSER_RESOURCE_TYPES } = require('./scraper');

const scrapingOptions = {
  benchmark: true,
  metrics: false,
  logResults: false,
  waitUntil: WAIT_EVENTS.DOMCONTENTLOADED,
  allowedResources: [BROWSER_RESOURCE_TYPES.DOCUMENT],
  scrapingFunction: () => {
    const selected = document.querySelectorAll('tbody a');
    const data = [];
    for (let i = 0; i < selected.length; i++) {
      if (selected[i].href) {
        data.push(selected[i].href);
      }
    }
    return data.length ? data : null;
  },
  checkErrors: true,
  whatStringToReplace: null,
  replaceWithString: null,
  jsonInputFile: 'urls',
  jsonOutputFile: 'output',
};

runScraper(scrapingOptions);
