const fs = require('fs');
// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const config = require('./config.json');
const kleur = require('kleur');
const { WAIT_EVENTS, BROWSER_RESOURCE_TYPES } = require('./constants');

const currentDirectory = __dirname;

function createProgressBar(totalSteps, currentJob, totalJobs) {
  const progressBarLength = 20;
  const stepSize = totalSteps / progressBarLength;
  let currentStep = 0;

  process.stdout.write('[                    ] 0%' + ` (${currentJob}/${totalJobs})`);

  return {
    update: () => {
      currentStep += 1;
      const progress = Math.floor((currentStep / totalSteps) * 100);
      const completedSteps = Math.floor(currentStep / stepSize);

      process.stdout.clearLine();
      process.stdout.cursorTo(0);

      const progressBar = '='.repeat(completedSteps) + ' '.repeat(progressBarLength - completedSteps);

      process.stdout.write(`[${progressBar}] ${progress}%` + ` (${currentJob}/${totalJobs})`);
    },
  };
}

async function scrape(
  urlsToScrape,
  includeMetrics = false,
  waitUntil,
  allowedResources,
  credentials,
  scrapingFunction,
  checkErrors = false,
  currentJob,
  totalJobs,
) {
  const browser = await puppeteer.launch({
    ...config.puppeteerOptions,
  });

  async function scrapeURL(url) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    if (credentials && credentials.length > 0) {
      await page.authenticate(credentials);
    }

    if (allowedResources && allowedResources.length > 0) {
      await page.setRequestInterception(true);

      page.on('request', (req) => {
        if (allowedResources.includes(req.resourceType())) {
          req.continue();
        } else {
          req.abort();
        }
      });
    }

    if (checkErrors) {
      try {
        const response = await page.goto(url, { waitUntil });
        if (includeMetrics) {
          const metrics = await page.metrics();
          console.info(metrics);
        }
        if (response && (response.status() < 200 || response.status() >= 400)) {
          if (errorFree) {
            errorFree = false;
          }
        }
        await page.close();
        progressBar.update();
        return { url, status: response.status() };
      } catch (error) {
        if (errorFree) {
          errorFree = false;
        }
        await page.close();
        progressBar.update();

        return { url, status: error.message };
      }
    } else {
      await page.goto(url, { waitUntil });

      if (includeMetrics) {
        const metrics = await page.metrics();
        console.info(metrics);
      }

      let data = await page.evaluate(scrapingFunction);

      await page.close();
      progressBar.update();
      return data;
    }
  }

  let errorFree = true;
  const progressBar = createProgressBar(urlsToScrape.length, currentJob, totalJobs);
  const chunk = 450;
  let results = [];
  if (urlsToScrape.length > chunk) {
    for (let i = 0; i < urlsToScrape.length; i += chunk) {
      const chunkedUrls = urlsToScrape.slice(i, i + chunk);
      let chunkedResults = await Promise.all(chunkedUrls.map(scrapeURL));
      results.push(chunkedResults);
    }
    results = results.flat();
  } else {
    results = await Promise.all(urlsToScrape.map(scrapeURL));
  }
  if (checkErrors) {
    results = results.filter((result) => result.status >= 400 || typeof result.status === 'string');
  }
  process.stdout.write('\n');
  if (!errorFree) {
    console.log(kleur.red().bold('Errors have occured on some URLs. Check the output file for more details'));
  } else {
    console.log(kleur.green().bold('All URLs were scraped successfully'));
  }

  await browser.close();
  return results;
}

const validOptionTypes = {
  benchmark: 'boolean',
  metrics: 'boolean',
  logResults: 'boolean',
  waitUntil: 'string',
  allowedResources: 'object-string',
  credentials: 'object-string',
  scrapingFunction: 'function',
  checkErrors: 'boolean',
  whatStringToReplace: 'string',
  replaceWithString: 'string',
  jsonInputFile: 'string',
  jsonOutputFile: 'string',
  parentDir: 'string',
  currentJob: 'number',
  totalJobs: 'number',
};

function validateOptions(options) {
  for (const option in options) {
    // throw error in the following cases:
    // 1. option is not of the correct type
    // 2. option is an array and it is populated with items of the wrong type
    if (
      typeof options[option] !== validOptionTypes[option].split('-')[0] ||
      (Array.isArray(options[option]) &&
        options[option].length > 0 &&
        options[option].some((item) => typeof item !== validOptionTypes[option].split('-')[1]))
    ) {
      throw new Error(`Invalid type for option ${option}: ${options[option]}`);
    }
  }
}

/**
 * Runs the scraper with the provided options.
 *
 * @param {Object} options - The options for running the scraper.
 * @param {boolean} options.benchmark - Whether to enable benchmarking. Defaults to true.
 * @param {boolean} options.metrics - Whether to include metrics in the scraping process. Defaults to false.
 * @param {boolean} options.logResults - Whether to log the scraped results. Defaults to false.
 * @param {string} options.waitUntil - The waitUntil value for page navigation. Defaults to 'load'.
 * @param {Array<string>} options.allowedResources - The allowed resource types for page requests. Defaults to an empty array.
 * @param {Object<string, string>} options.credentials - The credentials for the page. Defaults to an empty object.
 * @param {Function} options.scrapingFunction - The function to be executed for scraping. Defaults to an empty function.
 * @param {boolean} options.checkErrors - Whether to check for errors during scraping. Defaults to false.
 * @param {string} options.whatStringToReplace - The string to be replaced in the URLs. Defaults to an empty string.
 * @param {string} options.replaceWithString - The string to replace the matched string in the URLs. Defaults to an empty string.
 * @param {string} options.jsonInputFile - The input JSON file name.
 * @param {string} options.jsonOutputFile - The output JSON file name.
 * @param {string} options.parentDir - The parent directory for the JSON files.
 * @param {number} options.currentJob - The current job number.
 * @param {number} options.totalJobs - The total number of jobs.
 * @throws {Error} If any of the options have invalid types.
 * @returns {Promise<Array<Object>>} The scraped data.
 */
async function runScraper(options) {
  const {
    benchmark = true,
    metrics = false,
    logResults = false,
    waitUntil = WAIT_EVENTS.LOAD,
    allowedResources = [],
    credentials = {},
    scrapingFunction = () => {},
    checkErrors = false,
    whatStringToReplace = '',
    replaceWithString = '',
    jsonInputFile,
    jsonOutputFile,
    parentDir,
    currentJob,
    totalJobs,
  } = options;

  validateOptions(options);

  // create directory if it doesn't exist
  if (!fs.existsSync(`${currentDirectory}/${parentDir}`)) {
    fs.mkdirSync(`${currentDirectory}/${parentDir}`);
  }
  const data = fs.readFileSync(`${currentDirectory}/${parentDir}/${jsonInputFile ? jsonInputFile : 'data'}.json`);
  console.log(`Running job ${currentJob} of ${totalJobs}...`);
  const urls = JSON.parse(data).flat();
  if (whatStringToReplace && replaceWithString) {
    for (let i = 0; i < urls.length; i++) {
      urls[i] = urls[i].replace(whatStringToReplace, replaceWithString);
    }
  }
  const timings = new Map();
  if (benchmark) {
    timings.set('total', performance.now());
  }
  console.log(
    kleur.dim(
      `${checkErrors ? 'Checking' : 'Scraping'} ${urls.length} URLs from ${
        jsonInputFile ? jsonInputFile : 'data'
      }.json...`,
    ),
  );
  try {
    let scraped = await scrape(
      urls,
      metrics,
      waitUntil,
      allowedResources,
      credentials,
      scrapingFunction,
      checkErrors,
      currentJob,
      totalJobs,
    );

    if (benchmark) {
      timings.set('total', (performance.now() - timings.get('total')).toFixed(2));
      console.log(`Done! Completed in ${timings.get('total')} ms (${(timings.get('total') / 1000).toFixed(2)} s)`);
    } else {
      console.log('Done!');
    }
    if (logResults) {
      console.log('scraped:', scraped);
      console.log('length:', scraped.length);
    }
    console.log(
      `Writing ${checkErrors ? 'status code' : 'scraped'} data to ` +
        kleur.underline(`${currentDirectory}/${parentDir}/${jsonOutputFile ? jsonOutputFile : 'output'}.json`) +
        '...',
    );
    console.log('-------------------------------------------------');
    scraped = scraped.flat();
    fs.writeFileSync(
      `${currentDirectory}/${parentDir}/${jsonOutputFile ? jsonOutputFile : 'output'}.json`,
      JSON.stringify(scraped, null, 2),
    );
  } catch (error) {
    process.stdout.write('\n');
    console.log(error);
    process.exit(1);
  }
}

async function runBatchScraper(jobs) {
  for (let i = 0; i < jobs.length; ++i) {
    jobs[i].currentJob = i + 1;
    jobs[i].totalJobs = jobs.length;
    await runScraper(jobs[i]);
  }
}

module.exports = {
  runBatchScraper,
};
