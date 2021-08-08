// LinuxServer Guacamole Client
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const http = require('http');
const cloudcmd = require('cloudcmd');
const bodyParser = require('body-parser');
const { pamAuthenticate } = require('node-linux-pam');
const GuacamoleLite = require('guacamole-lite');

// Application Variables
const baseurl = process.env.SUBFOLDER || '/';
const CUSTOM_PORT = process.env.CUSTOM_PORT || 3000;

const app = express();
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

const server = http.Server(app);
const baserouter = express.Router();

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

// Spinup the Guac websocket proxy on port 3000 if guacd is running
// eslint-disable-next-line no-unused-vars
const guacServer = new GuacamoleLite({
  server,
  path: `${baseurl}guaclite`,
}, {
  host: '127.0.0.1',
  port: 4822,
}, clientOptions);

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

// Public JS and CSS
baserouter.use('/public', express.static(path.join(__dirname, '/public')));

// Embedded guac
baserouter.get('/', (req, res) => {
  let connectionstring = '';

  if (req.query.login) {
    connectionstring = encrypt({
      connection: {
        type: 'rdp',
        settings: {
          hostname: '127.0.0.1',
          port: '3389',
          security: 'any',
          'ignore-cert': true,
        },
      },
    });
  } else {
    connectionstring = encrypt({
      connection: {
        type: 'rdp',
        settings: {
          hostname: '127.0.0.1',
          port: '3389',
          username: 'abc',
          password: 'abc',
          security: 'any',
          'ignore-cert': true,
        },
      },
    });
  }

  res.render(path.join(__dirname, '/rdp.ejs'), {
    token: connectionstring,
    baseurl,
  });
});

// Web File Browser
baserouter.use(bodyParser.urlencoded({ extended: true }));

baserouter.get('/files', (req, res) => {
  res.send('Unauthorized');
  res.end();
});

baserouter.post('/files', (req, res, next) => {
  const options = {
    username: 'abc',
    password: req.body.password,
  };

  pamAuthenticate(options, (err) => {
    if (!err) {
      next();
    } else {
      res.send('Unauthorized');
      res.end();
    }
  });
});

baserouter.use('/files', cloudcmd({
  config: {
    root: '/',
    prefix: `${baseurl}files`,
    terminal: false,
    console: false,
    configDialog: false,
    contact: false,
    auth: false,
    name: 'Files',
    log: false,
    keysPanel: false,
    oneFilePanel: true,
  },
}));

// Spin up application on CUSTOM_PORT with fallback to port 3000
app.use(baseurl, baserouter);
server.listen(CUSTOM_PORT, () => {
  console.log(`listening on *: ${CUSTOM_PORT}`);
});
