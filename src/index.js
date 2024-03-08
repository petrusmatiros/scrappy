const { runScraper, WAIT_EVENTS, BROWSER_RESOURCE_TYPES } = require('./scraper');

const scrapingOptions = {
  benchmark: true,
  metrics: false,
  logResults: false,
  waitUntil: WAIT_EVENTS.LOAD,
  allowedResources: [],
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
  checkErrors: false,
  whatStringToReplace: null,
  replaceWithString: null,
  jsonInputFile: 'data',
  jsonOutputFile: 'sitemaps',
};

async function runBatchJob() {
  await runScraper(scrapingOptions);

  console.log('new');
  scrapingOptions.jsonInputFile = 'sitemaps';
  scrapingOptions.jsonOutputFile = 'urls';
  await runScraper(scrapingOptions);
  
  scrapingOptions.jsonInputFile = 'urls';
  scrapingOptions.jsonOutputFile = 'output';
  scrapingOptions.checkErrors = true;
  scrapingOptions.waitUntil = WAIT_EVENTS.DOMCONTENTLOADED;
  scrapingOptions.allowedResources = [
    BROWSER_RESOURCE_TYPES.DOCUMENT,
  ];
  await runScraper(scrapingOptions);
}

runBatchJob();