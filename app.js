// LinuxServer Guacamole Client

//// Application Variables ////
var baseUrl = process.env.SUBFOLDER || '/';
var socketIO = require('socket.io');
var crypto = require('crypto');
var ejs = require('ejs');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var { pamAuthenticatePromise } = require('node-linux-pam');
var CUSTOM_PORT = process.env.CUSTOM_PORT || 3000;
var USER = process.env.CUSTOM_USER || 'abc';
var PASSWORD = process.env.PASSWORD || 'abc';
var FORCE_LOGIN = process.env.FORCE_LOGIN || false;
var baseRouter = express.Router();
var fsw = require('fs').promises;
var fs = require('fs');

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
var guacServer = new GuacamoleLite({server: http,path:baseUrl +'guaclite'},{host:'127.0.0.1',port:4822},clientOptions);

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
        'hostname':'127.0.0.1',
        'port':'3389',
        'security': 'any',
        'ignore-cert': true
      }
    }
  };
  if ((! req.query.login) && (FORCE_LOGIN == false)) {
    Object.assign(connectString.connection.settings, {'username':USER,'password':PASSWORD});
  }
  res.render(__dirname + '/rdp.ejs', {token : encrypt(connectString)});
});

//// Web File Browser ////
// Send landing page 
baseRouter.get('/files', function (req, res) {
  res.sendFile( __dirname + '/public/filebrowser.html');
});
// Websocket comms //
io = socketIO(http, {path: baseUrl + 'files/socket.io',maxHttpBufferSize: 1e8});
io.on('connection', async function (socket) {
  let id = socket.id;
  var authData = {id: false};

  //// Functions ////

  // Check auth
  async function checkAuth(data) {
    let password = data[0];
    let directory = data[1];
    let options = {
      username: USER,
      password: password,
    };
    try {
      await pamAuthenticatePromise(options);
      authData = {id: true};
      getFiles(directory);
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
    await fsw.appendFile(filePath, Buffer.from(data));
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
      await fsw.rmdir(item, {recursive: true});
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
app.use(baseUrl, baseRouter);
http.listen(CUSTOM_PORT, function(){
  console.log('listening on *:' + CUSTOM_PORT);
});
