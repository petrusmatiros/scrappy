const fs = require('fs');
// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const config = require('./config.json');
const kleur = require('kleur');

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

async function runScraper(options) {
  const {
    benchmark,
    metrics,
    logResults,
    waitUntil,
    allowedResources,
    scrapingFunction,
    checkErrors,
    whatStringToReplace,
    replaceWithString,
    jsonInputFile,
    jsonOutputFile,
    parentDir,
    currentJob,
    totalJobs,
  } = options;
  // create directory if it doesn't exist
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir);
  }
  const data = fs.readFileSync(`${parentDir}/${jsonInputFile ? jsonInputFile : 'data'}.json`);
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
  console.log(kleur.dim(`${checkErrors ? 'Checking' : 'Scraping'} ${urls.length} URLs from ${jsonInputFile ? jsonInputFile : 'data'}.json...`));
  try {
    let scraped = await scrape(urls, metrics, waitUntil, allowedResources, scrapingFunction, checkErrors, currentJob, totalJobs);

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
    `Writing ${checkErrors ? 'status code' : 'scraped'} data to ` + kleur.underline(`${parentDir}/${jsonOutputFile ? jsonOutputFile : 'output'}.json`) + '...',
    );
    console.log('----------------------------------------');
    scraped = scraped.flat();
    fs.writeFileSync(
      `${parentDir}/${jsonOutputFile ? jsonOutputFile : 'output'}.json`,
      JSON.stringify(scraped, null, 2),
    );
  } catch (error) {
    process.stdout.write('\n');
    console.log(error);
    process.exit(1);
  }
}

module.exports = {
  runScraper,
};
