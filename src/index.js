const { runBatchScraper } = require('./scraper');
const { WAIT_EVENTS, BROWSER_RESOURCE_TYPES, SORT_OPTIONS } = require('./constants');

const currentDirectory = __dirname;

require('dotenv').config({ path: `${currentDirectory}/.env` });

runBatchScraper(
  (() => {
    const jobs = [];
    const scrapingOptions = {
      credentials: {
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD,
      },
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
      jsonInputFile: 'data',
      jsonOutputFile: 'sitemaps',
      sortOutput: {
        sortKey: 'url',
        sortOrder: SORT_OPTIONS.ASC,
      },
      parentDir: 'data',
    };
    jobs.push(scrapingOptions);

    jobs.push({ ...scrapingOptions, jsonInputFile: 'sitemaps', jsonOutputFile: 'urls' });

    jobs.push({
      ...scrapingOptions,
      jsonInputFile: 'urls',
      jsonOutputFile: 'output',
      waitUntil: WAIT_EVENTS.DOMCONTENTLOADED,
      allowedResources: [BROWSER_RESOURCE_TYPES.DOCUMENT],
      scrapingFunction: () => {
        const selected = document.getElementById('__next');
        return selected
          ? { url: window.location.href, servedByNext: true }
          : { url: window.location.href, servedByNext: false };
      },
    });
    return jobs;
  })(),
);
