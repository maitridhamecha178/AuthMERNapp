const fs = require('fs');
const util = require('util');
const LOG_FILE = 'error.log';

function writeLog(level, msg) {
  const text = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${typeof msg === 'string' ? msg : util.format(msg)}\n`;
  try { fs.appendFileSync(LOG_FILE, text); } catch (e) { /* ignore */ }
  if (level === 'error') {
    console.error(text);
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(text);
  }
}

module.exports = {
  info: (msg) => writeLog('info', msg),
  debug: (msg) => { if (process.env.NODE_ENV !== 'production') writeLog('debug', msg); },
  warn: (msg) => writeLog('warn', msg),
  error: (msg) => writeLog('error', msg),
};
