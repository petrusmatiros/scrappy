const fs = require('fs');
// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('./config.json');
puppeteer.use(StealthPlugin());
const kleur = require('kleur');

const WAIT_EVENTS = {
  LOAD: 'load',
  DOMCONTENTLOADED: 'domcontentloaded',
  NETWORKIDLE0: 'networkidle0',
  NETWORKIDLE2: 'networkidle2',
};

const BROWSER_RESOURCE_TYPES = {
  DOCUMENT: 'document',
  STYLESHEET: 'stylesheet',
  IMAGE: 'image',
  MEDIA: 'media',
  FONT: 'font',
  SCRIPT: 'script',
  TEXTTRACK: 'texttrack',
  XHR: 'xhr',
  FETCH: 'fetch',
  EVENTSOURCE: 'eventsource',
  WEBSOCKET: 'websocket',
  MANIFEST: 'manifest',
  OTHER: 'other',
};

function createProgressBar(totalSteps) {
  const progressBarLength = 20;
  const stepSize = totalSteps / progressBarLength;
  let currentStep = 0;

  process.stdout.write('[                    ] 0%');

  return {
    update: () => {
      currentStep += 1;
      const progress = Math.floor((currentStep / totalSteps) * 100);
      const completedSteps = Math.floor(currentStep / stepSize);

      process.stdout.clearLine();
      process.stdout.cursorTo(1);

      const progressBar = Array.from({ length: progressBarLength }, (_, index) => {
        return index < completedSteps ? '=' : ' ';
      }).join('');

      process.stdout.write(`[${progressBar}] ${progress}%`);
    },
  };
}

async function scrape(
  urlsToScrape,
  includeMetrics = false,
  waitUntil = WAIT_EVENTS.DOMCONTENTLOADED,
  allowedResources,
  scrapingFunction,
  checkErrors = false,
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
        // Check for client or server-side errors (HTTP status codes 4xx or 5xx)
        let toReturn;
        if (response && (response.status() < 200 || response.status() >= 400)) {
          if (errorFree) {
            errorFree = false;
          }
          toReturn = { url, status: response.status() };
        }
        await page.close();
        progressBar.update();
        return toReturn;
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
  const progressBar = createProgressBar(urlsToScrape.length);
  let results = await Promise.all(urlsToScrape.map(scrapeURL));
  if (checkErrors) {
    results = results.filter((res) => res !== null);
  }
  process.stdout.write('\n');
  if (!errorFree) {
    console.log(kleur.red().bold('There were errors while scraping the URLs.'));
  } else {
    console.log(kleur.green().bold('All URLs were scraped successfully.'));
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
  } = options;

  const data = fs.readFileSync(`${jsonInputFile ? jsonInputFile : 'data'}.json`);
  const urls = JSON.parse(data);
  if (whatStringToReplace && replaceWithString) {
    for (let i = 0; i < urls.length; i++) {
      urls[i] = urls[i].replace(whatStringToReplace, replaceWithString);
    }
  }
  const timings = new Map();
  if (benchmark) {
    timings.set('total', performance.now());
  }
  console.log(kleur.dim(`Scraping ${urls.length} URLs from ${jsonInputFile ? jsonInputFile : 'data'}.json...`));
  let scraped = await scrape(urls, metrics, waitUntil, allowedResources, scrapingFunction, checkErrors);
  if (benchmark) {
    timings.set('total', (performance.now() - timings.get('total')).toFixed(2));
    console.log(`Done! Completed in ${timings.get('total')} ms (${(timings.get('total')/1000).toFixed(2)} s)`)
  } else {
    console.log('Done!');
  }
  if (logResults) {
    console.log('scraped:', scraped);
    console.log('length:', scraped.length);
  }
  console.log(`Writing output to ${jsonOutputFile ? jsonOutputFile : 'output'}.json...`);
  console.log('----------------------------------------');
  scraped = scraped.length === 1 ? scraped[0] : scraped.flat();
  fs.writeFileSync(`${jsonOutputFile ? jsonOutputFile : 'output'}.json`, JSON.stringify(scraped, null, 2));
}

module.exports = {
  WAIT_EVENTS,
  BROWSER_RESOURCE_TYPES,
  runScraper,
};
