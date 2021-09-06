const { clientOptions, connectionOptions } = require('./options');
const { encrypt, deepMerge, loadConfig } = require('./utils');

const credentials = loadConfig(__dirname);
const options = deepMerge(connectionOptions, {
  connection: {
    settings: {
      username: 'abc',
      password: credentials.password,
    },
  },
});

console.log(encrypt(options, clientOptions.crypt.cypher, clientOptions.crypt.key));
