// LinuxServer Guacamole Client

//// Env variables ////
var CUSTOM_PORT = process.env.CUSTOM_PORT || 3000;
var CUSTOM_USER = process.env.CUSTOM_USER || 'abc';
var PASSWORD = process.env.PASSWORD || 'abc';
var RDP_HOST = process.env.RDP_HOST || '127.0.0.1';
var RDP_PORT = process.env.RDP_PORT || '3389';
var AUTO_LOGIN = process.env.AUTO_LOGIN || null;
var SUBFOLDER = process.env.SUBFOLDER || '/';
var TITLE = process.env.TITLE || 'Guacamole Client';
var CYPHER =process.env.CYPHER || 'LSIOGCKYLSIOGCKYLSIOGCKYLSIOGCKY';
var FM_NO_AUTH = process.env.FM_NO_AUTH || 'false';
var FM_HOME = process.env.FM_HOME || '/config';
var KEYBOARD = process.env.KEYBOARD || 'en-us-qwerty';

//// Application Variables ////
var package_info = require('./package.json');
var socketIO = require('socket.io');
var crypto = require('crypto');
var ejs = require('ejs');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var { pamAuthenticatePromise } = require('node-linux-pam');
var baseRouter = express.Router();
var fsw = require('fs').promises;
var fs = require('fs');

///// Guac Websocket Tunnel ////
var GuacamoleLite = require('guacamole-lite');
var clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: CYPHER
  },
  log: {
    verbose: false
  }
};

// Spinup the Guac websocket proxy on port 3000 if guacd is running
var guacServer = new GuacamoleLite({server: http,path:SUBFOLDER +'guaclite'},{host:'127.0.0.1',port:4822},clientOptions);

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
  return new Buffer.from(JSON.stringify(data)).toString('base64');
};

//// Public JS and CSS ////
baseRouter.use(express.static(__dirname + '/public'));

//// Embedded guac ////
baseRouter.get('/', function (req, res) {
  let connectString = {
    'connection':{
      'type':'rdp',
      'settings':{
        'hostname': RDP_HOST,
        'port': RDP_PORT,
        'security': 'any',
        'ignore-cert': true,
        'resize-method': 'display-update',
        'server-layout': KEYBOARD
      }
    }
  };
  if (((! req.query.login) && (AUTO_LOGIN == 'true')) || ((! req.query.login) && (PASSWORD == 'abc') && (AUTO_LOGIN !== 'false'))) {
    Object.assign(connectString.connection.settings, {'username':CUSTOM_USER,'password':PASSWORD});
  }
  res.render(__dirname + '/rdp.ejs', {token : encrypt(connectString), title: TITLE, keyboard: KEYBOARD});
});

//// Web app manifest ////
baseRouter.get('/manifest.json', function (req, res) {
  res.render(__dirname + '/manifest.ejs', {version: package_info.version, title: TITLE});
});

//// Web File Browser ////
// Send landing page 
baseRouter.get('/files', function (req, res) {
  res.sendFile( __dirname + '/public/filebrowser.html');
});
// Websocket comms //
io = socketIO(http, {path: SUBFOLDER + 'files/socket.io',maxHttpBufferSize: 200000000});
io.on('connection', async function (socket) {
  let id = socket.id;
  var authData = {id: false};

  //// Functions ////

  // Check auth
  async function checkAuth(password) {
    let options = {
      username: CUSTOM_USER,
      password: password,
    };
    if (FM_NO_AUTH == 'true') {
      authData = {id: true};
      getFiles(FM_HOME);
      return;
    }
    try {
      await pamAuthenticatePromise(options);
      authData = {id: true};
      getFiles(FM_HOME);
    } catch(e) {
      authData = {id: false};
      send('badauth');
    }
  }

  // Emit to user
  function send(command, data) {
    io.sockets.to(id).emit(command, data);
  }

  // Get file list for directory
  async function getFiles(directory) {
    if (! authData.id == true) {
      return;
    };
    let items = await fsw.readdir(directory);
    if (items.length > 0) {
      let dirs = [];
      let files = [];
      for await (let item of items) {
        let fullPath = directory + '/' + item;
        if (fs.lstatSync(fullPath).isDirectory()) {
          dirs.push(item);
        } else {
          files.push(item);
        }
      }
      send('renderfiles', [dirs, files, directory]);
    } else {
      send('renderfiles', [[], [], directory]);
    }
  }

  // Send file to client
  async function downloadFile(file) {
    if (! authData.id == true) {
      return;
    };
    let fileName = file.split('/').slice(-1)[0];
    let data = await fsw.readFile(file);
    send('sendfile', [data, fileName]);
  }

  // Write client sent file
  async function uploadFile(res) {
    if (! authData.id == true) {
      return;
    };
    let directory = res[0];
    let filePath = res[1];
    let data = res[2];
    let render = res[3];
    let dirArr = filePath.split('/');
    let folder = filePath.replace(dirArr[dirArr.length - 1], '')
    await fsw.mkdir(folder, { recursive: true });
    await fsw.writeFile(filePath, Buffer.from(data));
    if (render) {
      getFiles(directory);
    }
  }

  // Delete files
  async function deleteFiles(res) {
    if (! authData.id == true) {
      return;
    };
    let item = res[0];
    let directory = res[1];
    item = item.replace("|","'"); 
    if (fs.lstatSync(item).isDirectory()) {
      await fsw.rm(item, {recursive: true});
    } else {
      await fsw.unlink(item);
    }
    getFiles(directory);
  }

  // Create a folder
  async function createFolder(res) {
    if (! authData.id == true) {
      return;
    };
    let dir = res[0];
    let directory = res[1];
    if (!fs.existsSync(dir)){
      await fsw.mkdir(dir);
    }
    getFiles(directory);
  }

  // Incoming socket requests
  socket.on('auth', checkAuth);
  socket.on('getfiles', getFiles);
  socket.on('downloadfile', downloadFile);
  socket.on('uploadfile', uploadFile);
  socket.on('deletefiles', deleteFiles);
  socket.on('createfolder', createFolder);
});

// Spin up application on CUSTOM_PORT with fallback to port 3000
app.use(SUBFOLDER, baseRouter);
http.listen(CUSTOM_PORT, function(){
  console.log('listening on *:' + CUSTOM_PORT);
});
