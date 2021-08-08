// Application Variables
const crypto = require('crypto');

const PASSWORD = process.env.PASSWORD || 'abc';

// Guac Websocket Tunnel
const clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: 'LSIOGCKYLSIOGCKYLSIOGCKYLSIOGCKY',
  },
  log: {
    verbose: false,
  },
};

// Function needed to encrypt the token string for guacamole connections
const encrypt = (value) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(clientOptions.crypt.cypher, clientOptions.crypt.key, iv);
  let crypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
  crypted += cipher.final('base64');
  const data = {
    iv: iv.toString('base64'),
    value: crypted,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

const connectionstring = encrypt({
  connection: {
    type: 'rdp',
    settings: {
      hostname: '127.0.0.1',
      port: '3389',
      username: 'abc',
      password: PASSWORD,
      security: 'any',
      'ignore-cert': true,
    },
  },
});

console.log(connectionstring);
