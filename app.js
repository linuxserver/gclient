// LinuxServer Guacamole Client

//// Application Variables ////
var crypto = require('crypto');
var ejs = require('ejs');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var cloudcmd = require('cloudcmd');
var io = require('socket.io');
var bodyParser = require('body-parser');
var { pamAuthenticate, pamErrors } = require('node-linux-pam');
var CUSTOM_PORT = process.env.CUSTOM_PORT || 3000;

///// Guac Websocket Tunnel ////
var GuacamoleLite = require('guacamole-lite');
var clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: 'LSIOGCKYLSIOGCKYLSIOGCKYLSIOGCKY'
  },
  log: {
    verbose: false
  }
};
// Spinup the Guac websocket proxy on port 3000 if guacd is running
var guacServer = new GuacamoleLite({server: http,path:'/guaclite'},{host:'127.0.0.1',port:4822},clientOptions);
// Function needed to encrypt the token string for guacamole connections
var encrypt = (value) => {
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv(clientOptions.crypt.cypher, clientOptions.crypt.key, iv);
  let crypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
  crypted += cipher.final('base64');
  var data = {
    iv: iv.toString('base64'),
    value: crypted
  };
  return new Buffer(JSON.stringify(data)).toString('base64');
};

//// Public JS and CSS ////
app.use('/public', express.static(__dirname + '/public'));
//// Embedded guac ////
app.get("/", function (req, res) {
 if (req.query.login){
    var connectionstring = encrypt(
      {
        "connection":{
          "type":"rdp",
          "settings":{
            "hostname":"127.0.0.1",
            "port":"3389",
            "security": "any",
            "ignore-cert": true
          }
        }
      });
  }
  else{
    var connectionstring = encrypt(
      {
        "connection":{
          "type":"rdp",
          "settings":{
            "hostname":"127.0.0.1",
            "port":"3389",
            "username":"abc",
            "password":"abc",
            "security": "any",
            "ignore-cert": true
          }
        }
      });
  }
  res.render(__dirname + '/rdp.ejs', {token : connectionstring});
});
//// Web File Browser ////
app.use(bodyParser.urlencoded({ extended: true }));
var socket = io(http, {path: 'files/socket.io'});
app.get('/files', function (req, res) {
  res.send('Unauthorized');
  res.end();
});
app.post('/files', function(req, res, next){
  var password = req.body.password;
  var options = {
    username: 'abc',
    password: password,
  };
  pamAuthenticate(options, function(err, code) {
    if (!err) {
      next();	
    } else {
      res.send('Unauthorized');
      res.end();
    }
  });
});
app.use('/files', cloudcmd({
  socket,
  config: {
    root: '/config',
    prefix: '/files',
    terminal: false,
    console: false,
    configDialog: false,
    contact: false,
    auth: false,
    name: 'Files',
    log: false,
  }
}))

// Spin up application on CUSTOM_PORT with fallback to port 3000
http.listen(CUSTOM_PORT, function(){
  console.log('listening on *:' + CUSTOM_PORT);
});
