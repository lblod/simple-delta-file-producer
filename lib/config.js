/* CONFIGURATION FILES */

export const TYPE_CONFIG = require('/config/type-config.json');

/* ENVIRONMENT VARIABLES */

export const LOG_INCOMING_DELTA = process.env.LOG_INCOMING_DELTA || false;
export const LOG_DELTA_REWRITE = process.env.LOG_DELTA_REWRITE || false;
export const LOG_OUTGOING_DELTA = process.env.LOG_OUTGOING_DELTA || false;
export const DELTA_INTERVAL = process.env.DELTA_INTERVAL_MS || 1000;
export const RELATIVE_FILE_PATH = process.env.RELATIVE_FILE_PATH || 'deltas';
export const FILE_GRAPH = process.env.FILE_GRAPH || 'http://mu.semte.ch/application';
export const APP_NAME = process.env.APP_NAME || 'simple-delta-file-producer';

/* STATICS */
export const PUBLISHER_URI =`http://data.lblod.info/services/${APP_NAME}`;
export const SHARE_FOLDER = '/share';
export const QUEUE_FOLDER = '/queue';
export const LOG_QUEUE_PROCESS = true;