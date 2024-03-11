<p align="center">
<img width="128px" src="./scrappy_icon.jpg" alt="logo" style="vertical-align:middle">
<h1 align="center">scrappy</h1>
<h3 align="center">a general purpose scraper using puppeteer</h3>
<p align="center">"nom nom nom"</p>
</p>


## Installation and setup
```bash
npm i
```

Add a json file with the urls you want to scrape, e.g. add `data.json` file in `src/data` with the following structure:
```json
[
  "https://www.example1.com",
  "https://www.example2.com",
  "https://www.example3.com"
]

```
> [!IMPORTANT]
> If you want to use authentication, add a `.env` file in the `src` directory


Configure your options for each job in `src/index.js` by pushing an options object for each job, e.g.:
```javascript
const { runBatchScraper } = require('./scraper');
const { WAIT_EVENTS, BROWSER_RESOURCE_TYPES } = require('./constants');

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
```

## Scraping configuration
| Option | Type | Description |
| --- | --- | --- |
| `benchmark` | boolean | if true, will log the total job time |
| `metrics` | boolean | if true, will log additional metrics |
| `logResults` | boolean | if true, will log the results of each job |
| `waitUntil` | string | one of the `WAIT_EVENTS` values (how long to wait before interacting with the page) |
| `allowedResources` | array of strings | resources to allow using the enum `BROWSER_RESOURCE_TYPES` (e.g. `[BROWSER_RESOURCE_TYPES.DOCUMENT]`) |
| `credentials` | object of strings | the credentials to use for authentication e.g `{username: 'username', password: 'password'}` |
| `scrapingFunction` | function | the function to run on the page |
| `checkErrors` | boolean | if true, will check for errors on the page (it only checks for errors and outputs it to the json output file) |
| `whatStringToReplace` | string | the string to replace in the input json file (e.g. makes it easier to replace domains) |
| `replaceWithString` | string | the string to replace the `whatStringToReplace` with |
| `jsonInputFile` | string | the name of the input json file |
| `jsonOutputFile` | string | the name of the output json file |
| `parentDir` | string | the parent directory of the input and output json file |

#### WAIT_EVENTS
| Value | Description |
| --- | --- |
| `LOAD` | consider navigation to be finished when the load event is fired |
| `DOMCONTENTLOADED` | consider navigation to be finished when the DOMContentLoaded event is fired |
| `NETWORKIDLE0` | consider navigation to be finished when there are no more than 0 network connections for at least 500 ms |
| `NETWORKIDLE2` | consider navigation to be finished when there are no more than 2 network connections for at least 500 ms |

#### BROWSER_RESOURCE_TYPES
| Value | Description |
| --- | --- |
| `DOCUMENT` | the main HTML document of the page |
| `STYLESHEET` | a CSS stylesheet |
| `IMAGE` | an image |
| `MEDIA` | a media resource |
| `FONT` | a font resource |
| `SCRIPT` | a script |
| `TEXTTRACK` | a text track resource |
| `XHR` | a resource fetched using XMLHttpRequest |
| `FETCH` | a fetch request |
| `EVENTSOURCE` | a resource received over a server-sent event |
| `WEBSOCKET` | a resource received over a websocket |
| `MANIFEST` | a manifest |
| `OTHER` | a other type of resource |


## Running the scraper
The `runBatchScraper` function will run the jobs sequentially - that's it!

To run the script, just run `npm run dev`:
```bash
npm run dev
```

