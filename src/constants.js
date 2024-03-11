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

const SORT_OPTIONS = {
  ASC: 'asc',
  DESC: 'desc',
};

module.exports = {
  WAIT_EVENTS,
  BROWSER_RESOURCE_TYPES,
  SORT_OPTIONS,
};
