// LinuxServer Guacamole Client
const path = require('path');
const express = require('express');
const cloudcmd = require('cloudcmd');
const { pamAuthenticate } = require('node-linux-pam');

const { clientOptions, connectionOptions } = require('./options');
const {
  encrypt,
  trimTrailingSlash,
  deepMerge,
  loadConfig,
} = require('./utils');

// Application Variables
const baseurl = process.env.SUBFOLDER || '/';

const app = express();
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

const baserouter = express.Router();
const credentials = loadConfig(path.resolve(__dirname, '..'));

// Public JS and CSS
baserouter.use('/public', express.static(path.join(__dirname, '..', '/public')));

// Embedded guac
baserouter.get('/', (req, res) => {
  const { crypt: { key, cypher } } = clientOptions;

  const token = req.query.login
    ? encrypt(connectionOptions, cypher, key)
    : encrypt(deepMerge(connectionOptions, {
      connection: {
        settings: credentials,
      },
    }), cypher, key);

  res.render(path.join(__dirname, '/rdp.ejs'), {
    token,
    baseurl,
  });
});

// Web File Browser
baserouter.use(express.json());
baserouter.use(express.urlencoded({
  extended: true,
}));

baserouter.get('/files', (req, res) => {
  res.status(401).send('Unauthorized');
});

baserouter.post('/files', (req, res, next) => {
  if (!req.body.password) {
    res.status(401).send('Unauthorized');
    return;
  }

  pamAuthenticate({
    username: credentials.username,
    password: req.body.password,
  }, (err) => {
    if (!err) {
      next();
      return;
    }

    res.status(401).send('Unauthorized');
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

app.use('/', baserouter);

exports.app = app;
