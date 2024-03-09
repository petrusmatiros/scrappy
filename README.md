<p align="center">
<img width="128px" src="./scrappy_icon.jpg" alt="logo" style="vertical-align:middle">
<h1 align="center">scrappy</h1>
<p align="center">nom nom nom</p>
</p>
a general purpose scraper using puppeteer

## Installation and setup
```bash
npm i
```

Add your json file with urls e.g. add `data.json` file in `src/data` with the following structure:
```json
[
  "https://www.example1.com",
  "https://www.example2.com",
  "https://www.example3.com"
],

```

Configure your options for each job in `src/index.js` in the `setupBatchJobs` function e.g.:
```javascript
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
```

## Scraping configuration
| Option | Type | Description |
| --- | --- | --- |
| `benchmark` | boolean | if true, will log the total job time |
| `metrics` | boolean | if true, will log additional metrics |
| `logResults` | boolean | if true, will log the results of each job |
| `waitUntil` | string | one of the `WAIT_EVENTS` values (how long to wait before interacting with the page) |
| `allowedResources` | array of strings | resources to allow using the enum `BROWSER_RESOURCE_TYPES` (e.g. `[BROWSER_RESOURCE_TYPES.DOCUMENT]]`) |
| `scrapingFunction` | function | the function to run on the page |
| `checkErrors` | boolean | if true, will check for errors on the page (it only checks for errors and outputs it to the json output file) |
| `whatStringToReplace` | string | the string to replace in the input json file (e.g. makes it easier to replace domains) |
| `replaceWithString` | string | the string to replace the `whatStringToReplace` with |
| `jsonInputFile` | string | the name of the input json file |
| `jsonOutputFile` | string | the name of the output json file |
| `parentDir` | string | the parent directory of the input and output json file |

## Running the scraper
The `runBatchJobs` function will run the jobs sequentially that have been setup using `setupBatchJobs` - that's it!

To run the script, just run `node index.js` in the `src` directory:
```bash
cd src
node index.js
```

