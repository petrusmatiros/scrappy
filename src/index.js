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
      parentDir: 'data',
      replaceString: {target: process.env.TARGET, replacement: process.env.REPLACEMENT}
    };
    jobs.push(scrapingOptions);

    jobs.push({ ...scrapingOptions, jsonInputFile: 'sitemaps', jsonOutputFile: 'urls' });

    jobs.push({
      ...scrapingOptions,
      jsonInputFile: 'urls',
      jsonOutputFile: 'output',
      checkErrors: true,
      waitUntil: WAIT_EVENTS.NETWORKIDLE0,
      allowedResources: [BROWSER_RESOURCE_TYPES.DOCUMENT],
    });
    return jobs;
  })(),
);
