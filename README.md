<p align="center">
<img width="128px" src="./scrappy_icon.jpg" alt="logo" style="vertical-align:middle">
<h1 align="center">scrappy</h1>
<p align="center">nom nom nom</p>
</p>
a general purpose scraper using puppeteer

## Installation
```bash
npm i
```

Add a `data.json` file in `src` with the following structure:
```json
{
  "urls": [
    "https://www.example1.com",
    "https://www.example2.com",
    "jttps://www.example3.com"
  ],
}
```

Configure your options in `src/index.js`:
```javascript
const scrapingOptions = {
  benchmark: true,
  metrics: false,
  logResults: true,
  waitUntil: WAIT_EVENTS.DOMCONTENTLOADED,
  allowedResources: [BROWSER_RESOURCE_TYPES.DOCUMENT],
  scrapingFunction: () => {
    const selected = document.querySelectorAll('a');
    return selected ? Array.from(selected).map((el) => el.href) : [];
  },
  checkErrors: true,
  whatToReplace: 'https://www.example.com',
  replaceWith: 'https://www.new.com',
};
```

Then run the script:
```bash
node index.js
```