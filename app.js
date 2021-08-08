// LinuxServer Guacamole Client
const path = require('path');
const express = require('express');
const http = require('http');
const cloudcmd = require('cloudcmd');
const bodyParser = require('body-parser');
const { pamAuthenticate } = require('node-linux-pam');
const GuacamoleLite = require('guacamole-lite');
const { clientOptions, connectionOptions } = require('./options');
const { encrypt, trimTrailingSlash, deepMerge } = require('./utils');

// Application Variables
const baseurl = process.env.SUBFOLDER || '/';
const CUSTOM_PORT = process.env.CUSTOM_PORT || 3000;

const app = express();
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

const server = http.Server(app);
const baserouter = express.Router();

// Spinup the Guac websocket proxy on port 3000 if guacd is running
// // eslint-disable-next-line no-unused-vars
const guacServer = new GuacamoleLite({
  server,
  path: '/guaclite',
}, {
  host: '127.0.0.1',
  port: 4822,
}, clientOptions);

// Public JS and CSS
baserouter.use('/public', express.static(path.join(__dirname, '/public')));

// Embedded guac
baserouter.get('/', (req, res) => {
  const { crypt: { key, cypher } } = clientOptions;

  const token = req.query.login
    ? encrypt(connectionOptions, cypher, key)
    : encrypt(deepMerge(connectionOptions, {
      connection: {
        settings: {
          username: 'abc',
          password: 'abc',
        },
      },
    }), cypher, key);

  res.render(path.join(__dirname, '/rdp.ejs'), {
    token,
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
  pamAuthenticate({
    username: 'abc',
    password: req.body.password,
  }, (err) => {
    if (err) {
      res.send('Unauthorized');
      res.end();
      return;
    }

    next();
  });
});

baserouter.use('/files', cloudcmd({
  config: {
    root: '/',
    prefix: `${trimTrailingSlash(baseurl)}/files`,
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
app.use('/', baserouter);
server.listen(CUSTOM_PORT, () => {
  console.log(`listening on *: ${CUSTOM_PORT}`);
});
