const http = require('http');
const GuacamoleLite = require('guacamole-lite');

const { app } = require('./lib/server');
const { clientOptions } = require('./lib/options');

const server = http.Server(app);

const CUSTOM_PORT = process.env.CUSTOM_PORT || 3000;

// Spinup the Guac websocket proxy on port 3000 if guacd is running
// eslint-disable-next-line no-unused-vars
const guacServer = new GuacamoleLite({
  server,
  path: '/guaclite',
}, {
  host: '127.0.0.1',
  port: 4822,
}, clientOptions);

// Spin up application on CUSTOM_PORT with fallback to port 3000
server.listen(CUSTOM_PORT, () => {
  console.log(`listening on *: ${CUSTOM_PORT}`);
});
