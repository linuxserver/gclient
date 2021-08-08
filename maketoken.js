const { clientOptions, connectionOptions } = require('./options');
const { encrypt, deepMerge } = require('./utils');

const PASSWORD = process.env.PASSWORD || 'abc';
const options = deepMerge(connectionOptions, {
  connection: {
    settings: {
      username: 'abc',
      password: PASSWORD,
    },
  },
});

console.log(encrypt(options, clientOptions.crypt.cypher, clientOptions.crypt.key));
