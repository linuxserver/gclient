const { clientOptions, connectionOptions } = require('./options');
const { encrypt, deepMerge } = require('./utils');

const makeToken = (credentials) => {
  if (!('username' in credentials)) {
    throw new Error('credential is missing `username`');
  }

  if (!('password' in credentials)) {
    throw new Error('credential is missing `password`');
  }

  return encrypt(deepMerge(connectionOptions, {
    connection: {
      settings: {
        username: credentials.username,
        password: credentials.password,
      },
    },
  }), clientOptions.crypt.cypher, clientOptions.crypt.key);
};

exports.makeToken = makeToken;
