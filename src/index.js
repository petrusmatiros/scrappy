const { runScraper, WAIT_EVENTS, BROWSER_RESOURCE_TYPES } = require('./scraper');

function setupBatchJobs() {
  const jobs = [];
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
    parentDir: 'data',
  };
  jobs.push(scrapingOptions)

  jobs.push({...scrapingOptions, jsonInputFile: 'sitemaps', jsonOutputFile: 'urls'})
  
  jobs.push({...scrapingOptions, jsonInputFile: 'urls', jsonOutputFile: 'output', checkErrors: true, waitUntil: WAIT_EVENTS.DOMCONTENTLOADED, allowedResources: [BROWSER_RESOURCE_TYPES.DOCUMENT]});
  return jobs;
}

async function runBatchJob() {
  const jobs = setupBatchJobs();
  for (let i = 0; i < jobs.length; ++i) {
    console.log(`Running job ${i + 1} of ${jobs.length}...`);
    jobs[i].currentJob = i + 1;
    jobs[i].totalJobs = jobs.length;
    await runScraper(jobs[i]);
  }
}
runBatchJob();