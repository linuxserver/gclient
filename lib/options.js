const clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: 'LSIOGCKYLSIOGCKYLSIOGCKYLSIOGCKY',
  },
  log: {
    level: 'NORMAL',
  },
};

const connectionOptions = {
  connection: {
    type: 'rdp',
    settings: {
      hostname: '127.0.0.1',
      port: '3389',
      security: 'any',
      'ignore-cert': true,
    },
  },
};

module.exports = {
  clientOptions,
  connectionOptions,
};
