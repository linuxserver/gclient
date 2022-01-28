var homeDir = '/config';
var host = window.location.hostname; 
var port = window.location.port;
var protocol = window.location.protocol;
var path = window.location.pathname;
var socket = io(protocol + '//' + host + ':' + port, { path: path + '/socket.io'});

// Auth on connect
socket.on('connect',function(){
  $('#filebrowser').empty();
  $('#filebrowser').append($('<div>').attr('id','loading'));
  socket.emit('auth', [$('#pass').val(), homeDir]);
});

// Get file list
function getFiles(directory) {
  directory = directory.replace("//","/");
  directory = directory.replace("|","'");
  let directoryClean = directory.replace("'","|");
  if ((directory !== '/') && (directory.endsWith('/'))) {
    directory = directory.slice(0, -1);
  }
  $('#filebrowser').empty();
  $('#filebrowser').append($('<div>').attr('id','loading'));
  socket.emit('getfiles', directory);
}

// Render retry auth
function badAuth() {
  $('#filebrowser').empty();
  let message = $('<p>').text('Unable to authenticate change password and ');
  let tryButton = $('<button>').attr('onclick', 'reLog()').text('try again');
  message.append(tryButton);
  $('#filebrowser').append(message);
}

// Re-try auth
function reLog() {
  $('#filebrowser').empty();
  $('#filebrowser').append($('<div>').attr('id','loading'));
  socket.disconnect();
  socket.connect();
}

// Render file list
async function renderFiles(data) {
  let dirs = data[0];
  let files = data[1];
  let directory = data[2];
  let baseName = directory.split('/').slice(-1)[0]; 
  let parentFolder = directory.replace(baseName,'');
  let parentLink = $('<td>').addClass('directory').attr('onclick', 'getFiles(\'' + parentFolder + '\');').text('..');
  let directoryClean = directory.replace("'","|");
  if (directoryClean == '/') {
    directoryClean = '';
  }
  let table = $('<table>').addClass('fileTable');
  let tableHeader = $('<tr>');
  for await (name of ['Name', 'Type', 'Delete (NO WARNING)']) {
    tableHeader.append($('<th>').text(name));
  }
  let parentRow = $('<tr>');
  for await (item of [parentLink, $('<td>').text('Parent'), $('<td>')]) {
    parentRow.append(item);
  }
  table.append(tableHeader,parentRow);
  $('#filebrowser').empty();
  $('#filebrowser').data('directory', directory);
  $('#filebrowser').append($('<div>').text(directory));
  $('#filebrowser').append(table);
  if (dirs.length > 0) {
    for await (let dir of dirs) {
      let tableRow = $('<tr>');
      let dirClean = dir.replace("'","|");
      let link = $('<td>').addClass('directory').attr('onclick', 'getFiles(\'' + directoryClean + '/' + dirClean + '\');').text(dir);
      let type = $('<td>').text('Dir');
      let del = $('<td>').append($('<button>').addClass('deleteButton').attr('onclick', 'deleter(\'' + directoryClean + '/' + dirClean + '\');').text('Delete'));
      for await (item of [link, type, del]) {
        tableRow.append(item);
      }
      table.append(tableRow);
    }
  }
  if (files.length > 0) {
    for await (let file of files) {
      let tableRow = $('<tr>');
      let fileClean = file.replace("'","|");
      let link = $('<td>').addClass('file').attr('onclick', 'downloadFile(\'' + directoryClean + '/' + fileClean + '\');').text(file);
      let type = $('<td>').text('File');
      let del = $('<td>').append($('<button>').addClass('deleteButton').attr('onclick', 'deleter(\'' + directoryClean + '/' + fileClean + '\');').text('Delete'));
      for await (item of [link, type, del]) {
        tableRow.append(item);
      }
      table.append(tableRow);
    }
  }
}

// Download a file
function downloadFile(file) {
  file = file.replace("|","'");
  socket.emit('downloadfile', file);
}

// Send buffer to download blob
function sendFile(res) {
  let data = res[0];
  let fileName = res[1];
  let blob = new Blob([data], { type: "application/octetstream" });
  let url = window.URL || window.webkitURL;
  link = url.createObjectURL(blob);
  let a = $("<a />");
  a.attr("download", fileName);
  a.attr("href", link);
  $("body").append(a);
  a[0].click();
  $("body").remove(a);
}

// Upload files to current directory
async function upload(input) {
  let directory = $('#filebrowser').data('directory');
  if (directory == '/') {
    directoryUp = '';
  } else {
    directoryUp = directory;
  }
  if (input.files && input.files[0]) {
    $('#filebrowser').empty();
    $('#filebrowser').append($('<div>').attr('id','loading'));
    for await (let file of input.files) {
      let reader = new FileReader();
      reader.onload = async function(e) {
        let fileName = file.name;
        if (e.total < 100000000) {
          let data = e.target.result;
          $('#filebrowser').append($('<div>').text('Uploading ' + fileName));
          if (file == input.files[input.files.length - 1]) {
            socket.emit('uploadfile', [directory, directoryUp + '/' + fileName, data, true]);
          } else {
            socket.emit('uploadfile', [directory, directoryUp + '/' + fileName, data, false]);
          }
        } else {
          $('#filebrowser').append($('<div>').text('File too big ' + fileName));
          await new Promise(resolve => setTimeout(resolve, 2000));
          socket.emit('getfiles', directory);
        }
      }
      reader.readAsArrayBuffer(file);
    }
  }
}

// Delete file/folder
function deleter(item) {
  let directory = $('#filebrowser').data('directory');
  $('#filebrowser').empty();
  $('#filebrowser').append($('<div>').attr('id','loading'));
  socket.emit('deletefiles', [item, directory]);
}

// Delete file/folder
function createFolder() {
  let directory = $('#filebrowser').data('directory');
  if (directory == '/') {
    directoryUp = '';
  } else {
    directoryUp = directory;
  }
  let folderName = $('#folderName').val();
  $('#folderName').val('');
  if ((folderName.length == 0) || (folderName.includes('/'))) {
    alert('Bad or Null Directory Name');
    return '';
  }
  $('#filebrowser').empty();
  $('#filebrowser').append($('<div>').attr('id','loading'));
  socket.emit('createfolder', [directoryUp + '/' + folderName, directory]);
}

// Incoming socket requests
socket.on('renderfiles', renderFiles);
socket.on('sendfile', sendFile);
socket.on('badauth', badAuth);
