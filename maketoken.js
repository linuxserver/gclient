const { makeToken } = require('./lib/token');
const { loadConfig } = require('./lib/utils');

console.log(makeToken(loadConfig(__dirname)));
