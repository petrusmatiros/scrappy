const fs = require('fs');
// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('./config.json');
const { log } = require('console');
puppeteer.use(StealthPlugin());

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

    if (allowedResources && allowedResources.length > 0) {
      await page.setRequestInterception(true);

      page.on('request', async (req) => {
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
        if (response && (response.status() < 200 || response.status() >= 400)) {
          return { url, error: response.status() };
        } else {
          return { url, error: null };
        }
      } catch (error) {
        return { url, error: error.message };
      }
    } else {
      await page.goto(url, { waitUntil });

      if (includeMetrics) {
        const metrics = await page.metrics();
        console.info(metrics);
      }

      const data = await page.evaluate(scrapingFunction);

      await page.close();

      return data;
    }
  }

  const results = await Promise.all(urlsToScrape.map(scrapeURL));

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
  const scraped = await scrape(urls, metrics, waitUntil, allowedResources, scrapingFunction, checkErrors);

  if (benchmark) {
    timings.set('total', (performance.now() - timings.get('total')).toFixed(2));
    console.log('benchmark (ms):', timings);
  }
  if (logResults) {
    console.log('scraped:', scraped);
    console.log('length:', scraped.length);
  }
  fs.writeFileSync(`${jsonOutputFile ? jsonOutputFile : 'output'}.json`, JSON.stringify(scraped[0], null, 2));
}

module.exports = {
  WAIT_EVENTS,
  BROWSER_RESOURCE_TYPES,
  runScraper,
};