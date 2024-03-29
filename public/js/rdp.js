// Sidebar shortcut
var keys = {};
$(document).keydown(function (e) {
  keys[e.which] = true;
  if (JSON.stringify(keys) == '{"16":true,"17":true,"18":true}') {
    $('#sidebar').toggle(100);
  }
});
$(document).keyup(function (e) {
  delete keys[e.which];
});

//// Guacamole related ////
var guac;
var context;
// Get display div from document
var display = document.getElementById('display');
// Instantiate client, using an HTTP tunnel for communications.
var connectionstring = $('#connectionstring').val();
var host = window.location.hostname;
var port = window.location.port;
var protocol = window.location.protocol;
if (protocol == 'http:') {
  var wsproto = 'ws:';
} else {
  var wsproto = 'wss:';
}
var path = window.location.pathname;
// Guac logic loop
var touchState = {down:false,left:false,middle:false,right:false,up:false,x:0,y:0};
function runGuac() {
  guac = new Guacamole.Client(
    new Guacamole.WebSocketTunnel(wsproto + '//' + host + ':' + port + path + 'guaclite?token=' + connectionstring + '&width=' + $(document).width() + '&height=' + $(document).height())
  );
  // Add client to display div
  display.appendChild(guac.getDisplay().getElement());
  // Connect
  guac.connect();
  // Show current client clipboard
  guac.onclipboard = function clientClipboardReceived(stream, mimetype) {
    var reader;
    // If the received data is text, read it as a simple string (ignore blob data)
    if (/^text\//.exec(mimetype)) {
      reader = new Guacamole.StringReader(stream);
      // Assemble received data into a single string
      reader.ontext = function textReceived(text) {
        $('#clipboard').val(text);
      };
    }
  };
  // Error handler
  guac.onerror = function(error) {
    $('#display').empty();
    $('#display').append(
      '<center><h1>Error Connecting to Desktop</h1><br><p>'
       + JSON.stringify(error) + '</p>');
  };
  // Mouse
  var mouse = new Guacamole.Mouse(guac.getDisplay().getElement());
  mouse.onmousedown =
  mouse.onmouseup   =
  mouse.onmousemove = function(mouseState) {
    guac.sendMouseState(mouseState);
  };
  // Audio (bind after user interaction)
  $(window).bind('touchstart click', function(){
    if (!context) {
      guac.onaudio = function clientAudio(stream, mimetype) {
        context = Guacamole.AudioContextFactory.getAudioContext();
        context.resume().then(() => console.log('play audio'));
      };
    }
  });
  // Keyboard
  var keyboard = new Guacamole.Keyboard(document);
  keyboard.onkeydown = function (keysym) {
    guac.sendKeyEvent(1, keysym);
  };
  keyboard.onkeyup = function (keysym) {
    guac.sendKeyEvent(0, keysym);
  };
  // Disable keyboard events if our sidebar inputs are used
  $(".stopcapture").click(function(e) {
    keyboard.onkeydown = null;
    keyboard.onkeyup = null;
  }).on("blur", function(e) {
    keyboard.onkeydown = function(keysym) {
      guac.sendKeyEvent(1, keysym);
    };
    keyboard.onkeyup = function(keysym) {
      guac.sendKeyEvent(0, keysym);
    };
  });
  // Touchscreen
  var timeOut = 1000;
  var timer;
  var timerFired;
  var startX;
  var startY;
  var touched;
  $('#display').bind('touchmove', function(e) {
    e.preventDefault();
    let touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    let xPos = Math.round(touch.pageX);
    let yPos = Math.round(touch.pageY);
    if (touched) {
      if ((Math.abs(yPos - startY) > 2) || (Math.abs(xPos - startX) > 2)) {
        startX = 0;
        startY = 0;
        clearTimeout(timer);
        touchState.left = true;
        touchState.x = xPos;
        touchState.y = yPos;
        guac.sendMouseState(touchState);
      }
    } else {
      touchState.x = xPos;
      touchState.y = yPos;
      guac.sendMouseState(touchState);
    }
  });
  $('#display').bind('touchstart', function(e) {
    e.preventDefault();
    touched = true;
    let touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    startX = Math.round(touch.pageX);
    startY = Math.round(touch.pagey);
    touchState.x = Math.round(touch.pageX);
    touchState.y = Math.round(touch.pageY);
    guac.sendMouseState(touchState);
    timer = setTimeout(function() {
      touchState.left = false;
      touchState.right = true;
      guac.sendMouseState(touchState);
      touchState.right = false;
      guac.sendMouseState(touchState);
      timerFired = true;
    }, timeOut);
  });
  $('#display').bind('touchend', function(e) {
    e.preventDefault();
    touched = false;
    clearTimeout(timer);
    if (timerFired) {
      timerFired = false;
    } else {
      touchState.left = true;
      guac.sendMouseState(touchState);
      touchState.left = false;
      touchState.right = false;
      guac.sendMouseState(touchState);
    }
  });
}

// Disconnect on close
window.onunload = function() {
  guac.disconnect();
};
// Grab user input to set client clipboard
$('#clipboard').on('input', function() {
  guac.setClipboard($(this).val());
});
// When On Screen Keyboard is launched render keyboard
var keyboardLayout = $('#keyboard').val();
function poposk(){
  // Close the sidebar
  $('#sidebar').toggle(100);
  // Create the element for the keyboard and append it to the modal
  let layout = en_us_qwerty;
  if (keyboardLayout == 'de-de-qwertz') {
    layout = de_de_qwertz;
  } else if (keyboardLayout == 'fr-fr-azerty') {
    layout = fr_fr_azerty;
  } else if (keyboardLayout == 'it-it-qwerty') {
    layout = it_it_qwerty;
  } else if (keyboardLayout == 'es-es-qwerty') {
    layout = es_es_qwerty;
  }
  let osk = new Guacamole.OnScreenKeyboard(layout);
  osk.onkeydown = function (keysym) {
    guac.sendKeyEvent(1, keysym);
  };
  osk.onkeyup = function (keysym) {
    guac.sendKeyEvent(0, keysym);
  };
  $('#osk').empty();
  $('#osk').append(osk.getElement());
  // Resize keyboard to the width of the screen
  osk.resize($('#Keyboard').width());
  // Show keyboard
  $('#Keyboard').toggle(100);
}

// Render file browser
function popfiles() {
  $('#sidebar').toggle(100);
  $('#files').toggle(100)
}

// Go fullscreen
async function fullscreen() {
  let page = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen();
    await new Promise(resolve => setTimeout(resolve, 200));
    resize();
  } else {
    if (page.requestFullscreen) {
      page.requestFullscreen();
    } else if (page.webkitRequestFullscreen) {
      page.webkitRequestFullscreen();
    } else if (page.msRequestFullscreen) {
      page.msRequestFullscreen();
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    resize();
  }
}

// Run main logic on load
window.onload = function() {
  if ($(window).width() < 700) {
    $('.menu').addClass('menu-vert').removeClass('menu');
    $('.icons').addClass('icons-vert').removeClass('icons');
  } else {
    $('.menu-vert').addClass('menu').removeClass('menu-vert');
    $('.icons-vert').addClass('icons').removeClass('icons-vert');
  }
  runGuac();
}

// Resize screen to window
function resize(){
  let newWidth = Math.round($(display).width());
  let newHeight = Math.round($(display).height());
  if (newWidth < 700) {
    $('.menu').addClass('menu-vert').removeClass('menu');
    $('.icons').addClass('icons-vert').removeClass('icons');
  } else {
    $('.menu-vert').addClass('menu').removeClass('menu-vert');
    $('.icons-vert').addClass('icons').removeClass('icons-vert');
  }
  guac.sendSize(newWidth, newHeight);
}

// Debounce
function debounce(func, wait, immediate) {
  var timeout;
  return function executedFunction() {
    var context = this;
    var args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

// Handle resize
var resize = debounce(function() {
  let newWidth = Math.round($(display).width());
  let newHeight = Math.round($(display).height());
  if (newWidth < 700) {
    $('.menu').addClass('menu-vert').removeClass('menu');
    $('.icons').addClass('icons-vert').removeClass('icons');
  } else {
    $('.menu-vert').addClass('menu').removeClass('menu-vert');
    $('.icons-vert').addClass('icons').removeClass('icons-vert');
  }
  guac.sendSize(newWidth, newHeight);
}, 200);

// Listen for resize
window.addEventListener('resize', resize);

// Draggable open button
var dragX;
var dragY;
var draggable;
$('#sideopen').bind('mousedown', function(e) {
  dragX = Math.round(e.pageX);
  dragY = Math.round(e.pagey);
  draggable = true;
});
$('#sideopen').bind('mouseup', function(e) {
  draggable = false;
});
$('#sideopen').bind('mousemove', function(e) {
  let dragStateX = Math.round(e.pageX);
  let dragStateY = Math.round(e.pageY);
  if (((Math.abs(dragStateY - dragY) > 1) || (Math.abs(dragStateX - dragX) > 2)) && (draggable)) {
    dragX = 0;
    dragY = 0;
    $('#sideopen').css({top: (dragStateY - 1), left: (dragStateX - 10)});
  }
});
$('#sideopen').bind('touchstart', function(e) {
  e.preventDefault();
  let touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
  dragX = Math.round(touch.pageX);
  dragY = Math.round(touch.pageY);
  draggable = true;
});
$('#sideopen').bind('touchend', function(e) {
  e.preventDefault();
  draggable = false;
  $('#sidebar').toggle(100);
});
$('#sideopen').bind('touchmove', function(e) {
  e.preventDefault();
  let touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
  let dragStateX = Math.round(touch.pageX);
  let dragStateY = Math.round(touch.pageY);
  if (((Math.abs(dragStateY - dragY) > 1) || (Math.abs(dragStateX - dragX) > 2)) && (draggable)) {
    dragX = 0;
    dragY = 0;
    $('#sideopen').css({top: (dragStateY - 1), left: (dragStateX - 10)});
  }
});

//// On Screen keyboards ////
var en_us_qwerty = {"language":"en_US","type":"qwerty","width":22,"keys":{"0":[{"title":"0","requires":[]},{"title":")","requires":["shift"]}],"1":[{"title":"1","requires":[]},{"title":"!","requires":["shift"]}],"2":[{"title":"2","requires":[]},{"title":"@","requires":["shift"]}],"3":[{"title":"3","requires":[]},{"title":"#","requires":["shift"]}],"4":[{"title":"4","requires":[]},{"title":"$","requires":["shift"]}],"5":[{"title":"5","requires":[]},{"title":"%","requires":["shift"]}],"6":[{"title":"6","requires":[]},{"title":"^","requires":["shift"]}],"7":[{"title":"7","requires":[]},{"title":"&","requires":["shift"]}],"8":[{"title":"8","requires":[]},{"title":"*","requires":["shift"]}],"9":[{"title":"9","requires":[]},{"title":"(","requires":["shift"]}],"Back":65288,"Tab":65289,"Enter":65293,"Esc":65307,"Home":65360,"PgUp":65365,"PgDn":65366,"End":65367,"Ins":65379,"F1":65470,"F2":65471,"F3":65472,"F4":65473,"F5":65474,"F6":65475,"F7":65476,"F8":65477,"F9":65478,"F10":65479,"F11":65480,"F12":65481,"Del":65535,"Space":" ","Left":[{"title":"←","keysym":65361}],"Up":[{"title":"↑","keysym":65362}],"Right":[{"title":"→","keysym":65363}],"Down":[{"title":"↓","keysym":65364}],"Menu":[{"title":"Menu","keysym":65383}],"LShift":[{"title":"Shift","modifier":"shift","keysym":65505}],"RShift":[{"title":"Shift","modifier":"shift","keysym":65506}],"LCtrl":[{"title":"Ctrl","modifier":"control","keysym":65507}],"RCtrl":[{"title":"Ctrl","modifier":"control","keysym":65508}],"Caps":[{"title":"Caps","modifier":"caps","keysym":65509}],"LAlt":[{"title":"Alt","modifier":"alt","keysym":65513}],"RAlt":[{"title":"Alt","modifier":"alt","keysym":65514}],"Super":[{"title":"Super","modifier":"super","keysym":65515}],"`":[{"title":"`","requires":[]},{"title":"~","requires":["shift"]}],"-":[{"title":"-","requires":[]},{"title":"_","requires":["shift"]}],"=":[{"title":"=","requires":[]},{"title":"+","requires":["shift"]}],",":[{"title":",","requires":[]},{"title":"<","requires":["shift"]}],".":[{"title":".","requires":[]},{"title":">","requires":["shift"]}],"/":[{"title":"/","requires":[]},{"title":"?","requires":["shift"]}],"[":[{"title":"[","requires":[]},{"title":"{","requires":["shift"]}],"]":[{"title":"]","requires":[]},{"title":"}","requires":["shift"]}],"\\":[{"title":"\\","requires":[]},{"title":"|","requires":["shift"]}],";":[{"title":";","requires":[]},{"title":":","requires":["shift"]}],"'":[{"title":"'","requires":[]},{"title":"\"","requires":["shift"]}],"q":[{"title":"q","requires":[]},{"title":"Q","requires":["caps"]},{"title":"Q","requires":["shift"]},{"title":"q","requires":["caps","shift"]}],"w":[{"title":"w","requires":[]},{"title":"W","requires":["caps"]},{"title":"W","requires":["shift"]},{"title":"w","requires":["caps","shift"]}],"e":[{"title":"e","requires":[]},{"title":"E","requires":["caps"]},{"title":"E","requires":["shift"]},{"title":"e","requires":["caps","shift"]}],"r":[{"title":"r","requires":[]},{"title":"R","requires":["caps"]},{"title":"R","requires":["shift"]},{"title":"r","requires":["caps","shift"]}],"t":[{"title":"t","requires":[]},{"title":"T","requires":["caps"]},{"title":"T","requires":["shift"]},{"title":"t","requires":["caps","shift"]}],"y":[{"title":"y","requires":[]},{"title":"Y","requires":["caps"]},{"title":"Y","requires":["shift"]},{"title":"y","requires":["caps","shift"]}],"u":[{"title":"u","requires":[]},{"title":"U","requires":["caps"]},{"title":"U","requires":["shift"]},{"title":"u","requires":["caps","shift"]}],"i":[{"title":"i","requires":[]},{"title":"I","requires":["caps"]},{"title":"I","requires":["shift"]},{"title":"i","requires":["caps","shift"]}],"o":[{"title":"o","requires":[]},{"title":"O","requires":["caps"]},{"title":"O","requires":["shift"]},{"title":"o","requires":["caps","shift"]}],"p":[{"title":"p","requires":[]},{"title":"P","requires":["caps"]},{"title":"P","requires":["shift"]},{"title":"p","requires":["caps","shift"]}],"a":[{"title":"a","requires":[]},{"title":"A","requires":["caps"]},{"title":"A","requires":["shift"]},{"title":"a","requires":["caps","shift"]}],"s":[{"title":"s","requires":[]},{"title":"S","requires":["caps"]},{"title":"S","requires":["shift"]},{"title":"s","requires":["caps","shift"]}],"d":[{"title":"d","requires":[]},{"title":"D","requires":["caps"]},{"title":"D","requires":["shift"]},{"title":"d","requires":["caps","shift"]}],"f":[{"title":"f","requires":[]},{"title":"F","requires":["caps"]},{"title":"F","requires":["shift"]},{"title":"f","requires":["caps","shift"]}],"g":[{"title":"g","requires":[]},{"title":"G","requires":["caps"]},{"title":"G","requires":["shift"]},{"title":"g","requires":["caps","shift"]}],"h":[{"title":"h","requires":[]},{"title":"H","requires":["caps"]},{"title":"H","requires":["shift"]},{"title":"h","requires":["caps","shift"]}],"j":[{"title":"j","requires":[]},{"title":"J","requires":["caps"]},{"title":"J","requires":["shift"]},{"title":"j","requires":["caps","shift"]}],"k":[{"title":"k","requires":[]},{"title":"K","requires":["caps"]},{"title":"K","requires":["shift"]},{"title":"k","requires":["caps","shift"]}],"l":[{"title":"l","requires":[]},{"title":"L","requires":["caps"]},{"title":"L","requires":["shift"]},{"title":"l","requires":["caps","shift"]}],"z":[{"title":"z","requires":[]},{"title":"Z","requires":["caps"]},{"title":"Z","requires":["shift"]},{"title":"z","requires":["caps","shift"]}],"x":[{"title":"x","requires":[]},{"title":"X","requires":["caps"]},{"title":"X","requires":["shift"]},{"title":"x","requires":["caps","shift"]}],"c":[{"title":"c","requires":[]},{"title":"C","requires":["caps"]},{"title":"C","requires":["shift"]},{"title":"c","requires":["caps","shift"]}],"v":[{"title":"v","requires":[]},{"title":"V","requires":["caps"]},{"title":"V","requires":["shift"]},{"title":"v","requires":["caps","shift"]}],"b":[{"title":"b","requires":[]},{"title":"B","requires":["caps"]},{"title":"B","requires":["shift"]},{"title":"b","requires":["caps","shift"]}],"n":[{"title":"n","requires":[]},{"title":"N","requires":["caps"]},{"title":"N","requires":["shift"]},{"title":"n","requires":["caps","shift"]}],"m":[{"title":"m","requires":[]},{"title":"M","requires":["caps"]},{"title":"M","requires":["shift"]},{"title":"m","requires":["caps","shift"]}]},"layout":[["Esc",0.7,"F1","F2","F3","F4",0.7,"F5","F6","F7","F8",0.7,"F9","F10","F11","F12"],[0.1],{"main":{"alpha":[["`","1","2","3","4","5","6","7","8","9","0","-","=","Back"],["Tab","q","w","e","r","t","y","u","i","o","p","[","]","\\"],["Caps","a","s","d","f","g","h","j","k","l",";","'","Enter"],["LShift","z","x","c","v","b","n","m",",",".","/","RShift"],["LCtrl","Super","LAlt","Space","RAlt","Menu","RCtrl"]],"movement":[["Ins","Home","PgUp"],["Del","End","PgDn"],[1],["Up"],["Left","Down","Right"]]}}],"keyWidths":{"Back":2,"Tab":1.5,"\\":1.5,"Caps":1.85,"Enter":2.25,"LShift":2.1,"RShift":3.1,"LCtrl":1.6,"Super":1.6,"LAlt":1.6,"Space":6.1,"RAlt":1.6,"Menu":1.6,"RCtrl":1.6,"Ins":1.6,"Home":1.6,"PgUp":1.6,"Del":1.6,"End":1.6,"PgDn":1.6}};
var de_de_qwertz = {"language":"de_DE","type":"qwertz","width":23,"keys":{"0":[{"title":"0","requires":[]},{"title":"=","requires":["shift"]},{"title":"}","requires":["alt-gr"]}],"1":[{"title":"1","requires":[]},{"title":"!","requires":["shift"]}],"2":[{"title":"2","requires":[]},{"title":"\"","requires":["shift"]},{"title":"²","requires":["alt-gr"]}],"3":[{"title":"3","requires":[]},{"title":"§","requires":["shift"]},{"title":"³","requires":["alt-gr"]}],"4":[{"title":"4","requires":[]},{"title":"$","requires":["shift"]}],"5":[{"title":"5","requires":[]},{"title":"%","requires":["shift"]}],"6":[{"title":"6","requires":[]},{"title":"&","requires":["shift"]}],"7":[{"title":"7","requires":[]},{"title":"/","requires":["shift"]},{"title":"{","requires":["alt-gr"]}],"8":[{"title":"8","requires":[]},{"title":"(","requires":["shift"]},{"title":"[","requires":["alt-gr"]}],"9":[{"title":"9","requires":[]},{"title":")","requires":["shift"]},{"title":"]","requires":["alt-gr"]}],"Esc":65307,"F1":65470,"F2":65471,"F3":65472,"F4":65473,"F5":65474,"F6":65475,"F7":65476,"F8":65477,"F9":65478,"F10":65479,"F11":65480,"F12":65481,"Space":" ","Back":[{"title":"⟵","keysym":65288}],"Tab":[{"title":"Tab ↹","keysym":65289}],"Enter":[{"title":"↵","keysym":65293}],"Home":[{"title":"Pos 1","keysym":65360}],"PgUp":[{"title":"Bild ↑","keysym":65365}],"PgDn":[{"title":"Bild ↓","keysym":65366}],"End":[{"title":"Ende","keysym":65367}],"Ins":[{"title":"Einfg","keysym":65379}],"Del":[{"title":"Entf","keysym":65535}],"Left":[{"title":"←","keysym":65361}],"Up":[{"title":"↑","keysym":65362}],"Right":[{"title":"→","keysym":65363}],"Down":[{"title":"↓","keysym":65364}],"Menu":[{"title":"Menu","keysym":65383}],"LShift":[{"title":"Shift","modifier":"shift","keysym":65505}],"RShift":[{"title":"Shift","modifier":"shift","keysym":65506}],"LCtrl":[{"title":"Strg","modifier":"control","keysym":65507}],"RCtrl":[{"title":"Strg","modifier":"control","keysym":65508}],"Caps":[{"title":"Caps","modifier":"caps","keysym":65509}],"LAlt":[{"title":"Alt","modifier":"alt","keysym":65513}],"AltGr":[{"title":"AltGr","modifier":"alt-gr","keysym":65027}],"Meta":[{"title":"Meta","modifier":"meta","keysym":65511}],"^":[{"title":"^","requires":[]},{"title":"°","requires":["shift"]}],"ß":[{"title":"ß","requires":[]},{"title":"?","requires":["shift"]},{"title":"\\","requires":["alt-gr"]}],"´":[{"title":"´","requires":[]},{"title":"`","requires":["shift"]}],"+":[{"title":"+","requires":[]},{"title":"*","requires":["shift"]},{"title":"~","requires":["alt-gr"]}],"#":[{"title":"#","requires":[]},{"title":"'","requires":["shift"]}],"<":[{"title":"<","requires":[]},{"title":">","requires":["shift"]},{"title":"|","requires":["alt-gr"]}],",":[{"title":",","requires":[]},{"title":";","requires":["shift"]}],".":[{"title":".","requires":[]},{"title":":","requires":["shift"]}],"-":[{"title":"-","requires":[]},{"title":"_","requires":["shift"]}],"q":[{"title":"q","requires":[]},{"title":"Q","requires":["caps"]},{"title":"Q","requires":["shift"]},{"title":"q","requires":["caps","shift"]},{"title":"@","requires":["alt-gr"]}],"w":[{"title":"w","requires":[]},{"title":"W","requires":["caps"]},{"title":"W","requires":["shift"]},{"title":"w","requires":["caps","shift"]}],"e":[{"title":"e","requires":[]},{"title":"E","requires":["caps"]},{"title":"E","requires":["shift"]},{"title":"e","requires":["caps","shift"]},{"title":"€","requires":["alt-gr"]}],"r":[{"title":"r","requires":[]},{"title":"R","requires":["caps"]},{"title":"R","requires":["shift"]},{"title":"r","requires":["caps","shift"]}],"t":[{"title":"t","requires":[]},{"title":"T","requires":["caps"]},{"title":"T","requires":["shift"]},{"title":"t","requires":["caps","shift"]}],"z":[{"title":"z","requires":[]},{"title":"Z","requires":["caps"]},{"title":"Z","requires":["shift"]},{"title":"z","requires":["caps","shift"]}],"u":[{"title":"u","requires":[]},{"title":"U","requires":["caps"]},{"title":"U","requires":["shift"]},{"title":"u","requires":["caps","shift"]}],"i":[{"title":"i","requires":[]},{"title":"I","requires":["caps"]},{"title":"I","requires":["shift"]},{"title":"i","requires":["caps","shift"]}],"o":[{"title":"o","requires":[]},{"title":"O","requires":["caps"]},{"title":"O","requires":["shift"]},{"title":"o","requires":["caps","shift"]}],"p":[{"title":"p","requires":[]},{"title":"P","requires":["caps"]},{"title":"P","requires":["shift"]},{"title":"p","requires":["caps","shift"]}],"ü":[{"title":"ü","requires":[]},{"title":"Ü","requires":["caps"]},{"title":"Ü","requires":["shift"]},{"title":"ü","requires":["caps","shift"]}],"a":[{"title":"a","requires":[]},{"title":"A","requires":["caps"]},{"title":"A","requires":["shift"]},{"title":"a","requires":["caps","shift"]}],"s":[{"title":"s","requires":[]},{"title":"S","requires":["caps"]},{"title":"S","requires":["shift"]},{"title":"s","requires":["caps","shift"]}],"d":[{"title":"d","requires":[]},{"title":"D","requires":["caps"]},{"title":"D","requires":["shift"]},{"title":"d","requires":["caps","shift"]}],"f":[{"title":"f","requires":[]},{"title":"F","requires":["caps"]},{"title":"F","requires":["shift"]},{"title":"f","requires":["caps","shift"]}],"g":[{"title":"g","requires":[]},{"title":"G","requires":["caps"]},{"title":"G","requires":["shift"]},{"title":"g","requires":["caps","shift"]}],"h":[{"title":"h","requires":[]},{"title":"H","requires":["caps"]},{"title":"H","requires":["shift"]},{"title":"h","requires":["caps","shift"]}],"j":[{"title":"j","requires":[]},{"title":"J","requires":["caps"]},{"title":"J","requires":["shift"]},{"title":"j","requires":["caps","shift"]}],"k":[{"title":"k","requires":[]},{"title":"K","requires":["caps"]},{"title":"K","requires":["shift"]},{"title":"k","requires":["caps","shift"]}],"l":[{"title":"l","requires":[]},{"title":"L","requires":["caps"]},{"title":"L","requires":["shift"]},{"title":"l","requires":["caps","shift"]}],"ö":[{"title":"ö","requires":[]},{"title":"Ö","requires":["caps"]},{"title":"Ö","requires":["shift"]},{"title":"ö","requires":["caps","shift"]}],"ä":[{"title":"ä","requires":[]},{"title":"Ä","requires":["caps"]},{"title":"Ä","requires":["shift"]},{"title":"ä","requires":["caps","shift"]}],"y":[{"title":"y","requires":[]},{"title":"Y","requires":["caps"]},{"title":"Y","requires":["shift"]},{"title":"y","requires":["caps","shift"]}],"x":[{"title":"x","requires":[]},{"title":"X","requires":["caps"]},{"title":"X","requires":["shift"]},{"title":"x","requires":["caps","shift"]}],"c":[{"title":"c","requires":[]},{"title":"C","requires":["caps"]},{"title":"C","requires":["shift"]},{"title":"c","requires":["caps","shift"]}],"v":[{"title":"v","requires":[]},{"title":"V","requires":["caps"]},{"title":"V","requires":["shift"]},{"title":"v","requires":["caps","shift"]}],"b":[{"title":"b","requires":[]},{"title":"B","requires":["caps"]},{"title":"B","requires":["shift"]},{"title":"b","requires":["caps","shift"]}],"n":[{"title":"n","requires":[]},{"title":"N","requires":["caps"]},{"title":"N","requires":["shift"]},{"title":"n","requires":["caps","shift"]}],"m":[{"title":"m","requires":[]},{"title":"M","requires":["caps"]},{"title":"M","requires":["shift"]},{"title":"m","requires":["caps","shift"]},{"title":"µ","requires":["alt-gr"]}]},"layout":[["Esc",0.7,"F1","F2","F3","F4",0.7,"F5","F6","F7","F8",0.7,"F9","F10","F11","F12"],[0.1],{"main":{"alpha":[["^","1","2","3","4","5","6","7","8","9","0","ß","´","Back"],["Tab","q","w","e","r","t","z","u","i","o","p","ü","+",1,0.6],["Caps","a","s","d","f","g","h","j","k","l","ö","ä","#","Enter"],["LShift","<","y","x","c","v","b","n","m",",",".","-","RShift"],["LCtrl","Meta","LAlt","Space","AltGr","Menu","RCtrl"]],"movement":[["Ins","Home","PgUp"],["Del","End","PgDn"],[1],["Up"],["Left","Down","Right"]]}}],"keyWidths":{"Back":2,"Tab":1.5,"\\":1.5,"Caps":1.75,"Enter":1.25,"LShift":2,"RShift":2.1,"LCtrl":1.6,"Meta":1.6,"LAlt":1.6,"Space":6.1,"AltGr":1.6,"Menu":1.6,"RCtrl":1.6,"Ins":1.6,"Home":1.6,"PgUp":1.6,"Del":1.6,"End":1.6,"PgDn":1.6}};
var es_es_qwerty = {"language":"fr_FR","type":"azerty","width":22,"keys":{"F1":65470,"F2":65471,"F3":65472,"F4":65473,"F5":65474,"F6":65475,"F7":65476,"F8":65477,"F9":65478,"F10":65479,"F11":65480,"F12":65481,"Space":" ","Esc":[{"title":"Echap","keysym":65307}],"Back":[{"title":"⟵","keysym":65288}],"Tab":[{"title":"↹","keysym":65289}],"Enter":[{"title":"Entrée","keysym":65293}],"Home":[{"title":"Origine","keysym":65360}],"PgUp":[{"title":"Pg préc.","keysym":65365}],"PgDn":[{"title":"Pg suiv.","keysym":65366}],"End":[{"title":"Fin","keysym":65367}],"Ins":[{"title":"Inser","keysym":65379}],"Del":[{"title":"Suppr","keysym":65535}],"Left":[{"title":"←","keysym":65361}],"Up":[{"title":"↑","keysym":65362}],"Right":[{"title":"→","keysym":65363}],"Down":[{"title":"↓","keysym":65364}],"Menu":[{"title":"Menu","keysym":65383}],"LShift":[{"title":"Shift","modifier":"shift","keysym":65505}],"RShift":[{"title":"Shift","modifier":"shift","keysym":65506}],"LCtrl":[{"title":"Ctrl","modifier":"control","keysym":65507}],"RCtrl":[{"title":"Ctrl","modifier":"control","keysym":65508}],"Caps":[{"title":"Caps","modifier":"caps","keysym":65509}],"LAlt":[{"title":"Alt","modifier":"alt","keysym":65513}],"AltGr":[{"title":"AltGr","modifier":"alt-gr","keysym":65027}],"Meta":[{"title":"Meta","modifier":"meta","keysym":65511}],"²":[{"title":"²","requires":[]}],"&":[{"title":"&","requires":[]},{"title":"1","requires":["shift"]}],"é":[{"title":"é","requires":[]},{"title":"2","requires":["shift"]},{"title":"~","requires":["alt-gr"]}],"\"":[{"title":"\"","requires":[]},{"title":"3","requires":["shift"]},{"title":"#","requires":["alt-gr"]}],"'":[{"title":"'","requires":[]},{"title":"4","requires":["shift"]},{"title":"{","requires":["alt-gr"]}],"(":[{"title":"(","requires":[]},{"title":"5","requires":["shift"]},{"title":"[","requires":["alt-gr"]}],"-":[{"title":"-","requires":[]},{"title":"6","requires":["shift"]},{"title":"|","requires":["alt-gr"]}],"è":[{"title":"è","requires":[]},{"title":"7","requires":["shift"]},{"title":"`","requires":["alt-gr"]}],"_":[{"title":"_","requires":[]},{"title":"8","requires":["shift"]},{"title":"\\","requires":["alt-gr"]}],"ç":[{"title":"ç","requires":[]},{"title":"9","requires":["shift"]},{"title":"^","requires":["alt-gr"]}],"à":[{"title":"à","requires":[]},{"title":"0","requires":["shift"]},{"title":"@","requires":["alt-gr"]}],")":[{"title":")","requires":[]},{"title":"°","requires":["shift"]},{"title":"]","requires":["alt-gr"]}],"=":[{"title":"=","requires":[]},{"title":"+","requires":["shift"]},{"title":"}","requires":["alt-gr"]}],"^":[{"title":"^","requires":[]},{"title":"¨","requires":["shift"]}],"$":[{"title":"$","requires":[]},{"title":"£","requires":["shift"]},{"title":"¤","requires":["alt-gr"]}],"ù":[{"title":"ù","requires":[]},{"title":"%","requires":["shift"]}],"*":[{"title":"*","requires":[]},{"title":"µ","requires":["shift"]}],"<":[{"title":"<","requires":[]},{"title":">","requires":["shift"]}],",":[{"title":",","requires":[]},{"title":"?","requires":["shift"]}],";":[{"title":";","requires":[]},{"title":".","requires":["shift"]}],":":[{"title":":","requires":[]},{"title":"/","requires":["shift"]}],"!":[{"title":"!","requires":[]},{"title":"§","requires":["shift"]}],"a":[{"title":"a","requires":[]},{"title":"A","requires":["caps"]},{"title":"A","requires":["shift"]},{"title":"a","requires":["caps","shift"]}],"z":[{"title":"z","requires":[]},{"title":"Z","requires":["caps"]},{"title":"Z","requires":["shift"]},{"title":"z","requires":["caps","shift"]}],"e":[{"title":"e","requires":[]},{"title":"E","requires":["caps"]},{"title":"E","requires":["shift"]},{"title":"e","requires":["caps","shift"]},{"title":"€","requires":["alt-gr"]}],"r":[{"title":"r","requires":[]},{"title":"R","requires":["caps"]},{"title":"R","requires":["shift"]},{"title":"r","requires":["caps","shift"]}],"t":[{"title":"t","requires":[]},{"title":"T","requires":["caps"]},{"title":"T","requires":["shift"]},{"title":"t","requires":["caps","shift"]}],"y":[{"title":"y","requires":[]},{"title":"Y","requires":["caps"]},{"title":"Y","requires":["shift"]},{"title":"y","requires":["caps","shift"]}],"u":[{"title":"u","requires":[]},{"title":"U","requires":["caps"]},{"title":"U","requires":["shift"]},{"title":"u","requires":["caps","shift"]}],"i":[{"title":"i","requires":[]},{"title":"I","requires":["caps"]},{"title":"I","requires":["shift"]},{"title":"i","requires":["caps","shift"]}],"o":[{"title":"o","requires":[]},{"title":"O","requires":["caps"]},{"title":"O","requires":["shift"]},{"title":"o","requires":["caps","shift"]}],"p":[{"title":"p","requires":[]},{"title":"P","requires":["caps"]},{"title":"P","requires":["shift"]},{"title":"p","requires":["caps","shift"]}],"q":[{"title":"q","requires":[]},{"title":"Q","requires":["caps"]},{"title":"Q","requires":["shift"]},{"title":"q","requires":["caps","shift"]}],"s":[{"title":"s","requires":[]},{"title":"S","requires":["caps"]},{"title":"S","requires":["shift"]},{"title":"s","requires":["caps","shift"]}],"d":[{"title":"d","requires":[]},{"title":"D","requires":["caps"]},{"title":"D","requires":["shift"]},{"title":"d","requires":["caps","shift"]}],"f":[{"title":"f","requires":[]},{"title":"F","requires":["caps"]},{"title":"F","requires":["shift"]},{"title":"f","requires":["caps","shift"]}],"g":[{"title":"g","requires":[]},{"title":"G","requires":["caps"]},{"title":"G","requires":["shift"]},{"title":"g","requires":["caps","shift"]}],"h":[{"title":"h","requires":[]},{"title":"H","requires":["caps"]},{"title":"H","requires":["shift"]},{"title":"h","requires":["caps","shift"]}],"j":[{"title":"j","requires":[]},{"title":"J","requires":["caps"]},{"title":"J","requires":["shift"]},{"title":"j","requires":["caps","shift"]}],"k":[{"title":"k","requires":[]},{"title":"K","requires":["caps"]},{"title":"K","requires":["shift"]},{"title":"k","requires":["caps","shift"]}],"l":[{"title":"l","requires":[]},{"title":"L","requires":["caps"]},{"title":"L","requires":["shift"]},{"title":"l","requires":["caps","shift"]}],"m":[{"title":"m","requires":[]},{"title":"M","requires":["caps"]},{"title":"M","requires":["shift"]},{"title":"m","requires":["caps","shift"]}],"w":[{"title":"w","requires":[]},{"title":"W","requires":["caps"]},{"title":"W","requires":["shift"]},{"title":"w","requires":["caps","shift"]}],"x":[{"title":"x","requires":[]},{"title":"X","requires":["caps"]},{"title":"X","requires":["shift"]},{"title":"x","requires":["caps","shift"]}],"c":[{"title":"c","requires":[]},{"title":"C","requires":["caps"]},{"title":"C","requires":["shift"]},{"title":"c","requires":["caps","shift"]}],"v":[{"title":"v","requires":[]},{"title":"V","requires":["caps"]},{"title":"V","requires":["shift"]},{"title":"v","requires":["caps","shift"]}],"b":[{"title":"b","requires":[]},{"title":"B","requires":["caps"]},{"title":"B","requires":["shift"]},{"title":"b","requires":["caps","shift"]}],"n":[{"title":"n","requires":[]},{"title":"N","requires":["caps"]},{"title":"N","requires":["shift"]},{"title":"n","requires":["caps","shift"]}]},"layout":[["Esc",0.5,"F1","F2","F3","F4",0.7,"F5","F6","F7","F8",0.7,"F9","F10","F11","F12"],[0.1],{"main":{"alpha":[["²","&","é","\"","'","(","-","è","_","ç","à",")","=","Back"],["Tab","a","z","e","r","t","y","u","i","o","p","^","$",1,0.8],["Caps","q","s","d","f","g","h","j","k","l","m","ù","*","Enter"],["LShift","<","w","x","c","v","b","n",",",";",":","!","RShift"],["LCtrl","Meta","LAlt","Space","AltGr","Menu","RCtrl"]],"movement":[["Ins","Home","PgUp"],["Del","End","PgDn"],[1],["Up"],["Left","Down","Right"]]}}],"keyWidths":{"Esc":1.2,"Back":2,"Tab":1.3,"Caps":1.3,"Enter":1.7,"LShift":2,"RShift":2.1,"LCtrl":1.6,"Meta":1.6,"LAlt":1.6,"Space":6.1,"AltGr":1.6,"Menu":1.6,"RCtrl":1.6,"Ins":1.6,"Home":1.6,"PgUp":1.6,"Del":1.6,"End":1.6,"PgDn":1.6}};
var it_it_qwerty = {"language":"it_IT","type":"qwerty","width":23,"keys":{"0":[{"title":"0","requires":[]},{"title":"=","requires":["shift"]}],"1":[{"title":"1","requires":[]},{"title":"!","requires":["shift"]}],"2":[{"title":"2","requires":[]},{"title":"\"","requires":["shift"]}],"3":[{"title":"3","requires":[]},{"title":"£","requires":["shift"]}],"4":[{"title":"4","requires":[]},{"title":"$","requires":["shift"]}],"5":[{"title":"5","requires":[]},{"title":"%","requires":["shift"]},{"title":"€","requires":["alt-gr"]}],"6":[{"title":"6","requires":[]},{"title":"&","requires":["shift"]}],"7":[{"title":"7","requires":[]},{"title":"/","requires":["shift"]}],"8":[{"title":"8","requires":[]},{"title":"(","requires":["shift"]}],"9":[{"title":"9","requires":[]},{"title":")","requires":["shift"]}],"Esc":65307,"F1":65470,"F2":65471,"F3":65472,"F4":65473,"F5":65474,"F6":65475,"F7":65476,"F8":65477,"F9":65478,"F10":65479,"F11":65480,"F12":65481,"Space":" ","Back":[{"title":"⟵","keysym":65288}],"Tab":[{"title":"Tab ↹","keysym":65289}],"Enter":[{"title":"↵","keysym":65293}],"Home":[{"title":"Home","keysym":65360}],"PgUp":[{"title":"PgUp ↑","keysym":65365}],"PgDn":[{"title":"PgDn ↓","keysym":65366}],"End":[{"title":"End","keysym":65367}],"Ins":[{"title":"Ins","keysym":65379}],"Del":[{"title":"Del","keysym":65535}],"Left":[{"title":"←","keysym":65361}],"Up":[{"title":"↑","keysym":65362}],"Right":[{"title":"→","keysym":65363}],"Down":[{"title":"↓","keysym":65364}],"Menu":[{"title":"Menu","keysym":65383}],"LShift":[{"title":"Shift","modifier":"shift","keysym":65505}],"RShift":[{"title":"Shift","modifier":"shift","keysym":65506}],"LCtrl":[{"title":"Ctrl","modifier":"control","keysym":65507}],"RCtrl":[{"title":"Ctrl","modifier":"control","keysym":65508}],"Caps":[{"title":"Caps","modifier":"caps","keysym":65509}],"LAlt":[{"title":"Alt","modifier":"alt","keysym":65513}],"AltGr":[{"title":"AltGr","modifier":"alt-gr","keysym":65027}],"Meta":[{"title":"Meta","modifier":"meta","keysym":65511}],"\\":[{"title":"\\","requires":[]},{"title":"|","requires":["shift"]}],"'":[{"title":"'","requires":[]},{"title":"?","requires":["shift"]},{"title":"`","requires":["alt-gr","shift"]}],"ì":[{"title":"ì","requires":[]},{"title":"^","requires":["shift"]},{"title":"~","requires":["alt-gr","shift"]}],"q":[{"title":"q","requires":[]},{"title":"Q","requires":["caps"]},{"title":"Q","requires":["shift"]},{"title":"q","requires":["caps","shift"]}],"w":[{"title":"w","requires":[]},{"title":"W","requires":["caps"]},{"title":"W","requires":["shift"]},{"title":"w","requires":["caps","shift"]}],"e":[{"title":"e","requires":[]},{"title":"E","requires":["caps"]},{"title":"E","requires":["shift"]},{"title":"e","requires":["caps","shift"]},{"title":"€","requires":["alt-gr"]}],"r":[{"title":"r","requires":[]},{"title":"R","requires":["caps"]},{"title":"R","requires":["shift"]},{"title":"r","requires":["caps","shift"]}],"t":[{"title":"t","requires":[]},{"title":"T","requires":["caps"]},{"title":"T","requires":["shift"]},{"title":"t","requires":["caps","shift"]}],"y":[{"title":"y","requires":[]},{"title":"Y","requires":["caps"]},{"title":"Y","requires":["shift"]},{"title":"y","requires":["caps","shift"]}],"u":[{"title":"u","requires":[]},{"title":"U","requires":["caps"]},{"title":"U","requires":["shift"]},{"title":"u","requires":["caps","shift"]}],"i":[{"title":"i","requires":[]},{"title":"I","requires":["caps"]},{"title":"I","requires":["shift"]},{"title":"i","requires":["caps","shift"]}],"o":[{"title":"o","requires":[]},{"title":"O","requires":["caps"]},{"title":"O","requires":["shift"]},{"title":"o","requires":["caps","shift"]}],"p":[{"title":"p","requires":[]},{"title":"P","requires":["caps"]},{"title":"P","requires":["shift"]},{"title":"p","requires":["caps","shift"]}],"è":[{"title":"è","requires":[]},{"title":"è","requires":["caps"]},{"title":"é","requires":["shift"]},{"title":"é","requires":["caps","shift"]},{"title":"[","requires":["alt-gr"]},{"title":"{","requires":["alt-gr","shift"]}],"+":[{"title":"+","requires":[]},{"title":"+","requires":["caps"]},{"title":"*","requires":["shift"]},{"title":"*","requires":["caps","shift"]},{"title":"]","requires":["alt-gr"]},{"title":"}","requires":["alt-gr","shift"]}],"a":[{"title":"a","requires":[]},{"title":"A","requires":["caps"]},{"title":"A","requires":["shift"]},{"title":"a","requires":["caps","shift"]}],"s":[{"title":"s","requires":[]},{"title":"S","requires":["caps"]},{"title":"S","requires":["shift"]},{"title":"s","requires":["caps","shift"]}],"d":[{"title":"d","requires":[]},{"title":"D","requires":["caps"]},{"title":"D","requires":["shift"]},{"title":"d","requires":["caps","shift"]}],"f":[{"title":"f","requires":[]},{"title":"F","requires":["caps"]},{"title":"F","requires":["shift"]},{"title":"f","requires":["caps","shift"]}],"g":[{"title":"g","requires":[]},{"title":"G","requires":["caps"]},{"title":"G","requires":["shift"]},{"title":"g","requires":["caps","shift"]}],"h":[{"title":"h","requires":[]},{"title":"H","requires":["caps"]},{"title":"H","requires":["shift"]},{"title":"h","requires":["caps","shift"]}],"j":[{"title":"j","requires":[]},{"title":"J","requires":["caps"]},{"title":"J","requires":["shift"]},{"title":"j","requires":["caps","shift"]}],"k":[{"title":"k","requires":[]},{"title":"K","requires":["caps"]},{"title":"K","requires":["shift"]},{"title":"k","requires":["caps","shift"]}],"l":[{"title":"l","requires":[]},{"title":"L","requires":["caps"]},{"title":"L","requires":["shift"]},{"title":"l","requires":["caps","shift"]}],"ò":[{"title":"ò","requires":[]},{"title":"ò","requires":["caps"]},{"title":"ç","requires":["shift"]},{"title":"ç","requires":["caps","shift"]},{"title":"@","requires":["alt-gr"]}],"à":[{"title":"à","requires":[]},{"title":"à","requires":["caps"]},{"title":"°","requires":["shift"]},{"title":"°","requires":["caps","shift"]},{"title":"#","requires":["alt-gr"]}],"ù":[{"title":"ù","requires":[]},{"title":"ù","requires":["caps"]},{"title":"§","requires":["shift"]},{"title":"§","requires":["caps","shift"]}],"<":[{"title":"<","requires":[]},{"title":">","requires":["shift"]}],"z":[{"title":"z","requires":[]},{"title":"Z","requires":["caps"]},{"title":"Z","requires":["shift"]},{"title":"z","requires":["caps","shift"]}],"x":[{"title":"x","requires":[]},{"title":"X","requires":["caps"]},{"title":"X","requires":["shift"]},{"title":"x","requires":["caps","shift"]}],"c":[{"title":"c","requires":[]},{"title":"C","requires":["caps"]},{"title":"C","requires":["shift"]},{"title":"c","requires":["caps","shift"]}],"v":[{"title":"v","requires":[]},{"title":"V","requires":["caps"]},{"title":"V","requires":["shift"]},{"title":"v","requires":["caps","shift"]}],"b":[{"title":"b","requires":[]},{"title":"B","requires":["caps"]},{"title":"B","requires":["shift"]},{"title":"b","requires":["caps","shift"]}],"n":[{"title":"n","requires":[]},{"title":"N","requires":["caps"]},{"title":"N","requires":["shift"]},{"title":"n","requires":["caps","shift"]}],"m":[{"title":"m","requires":[]},{"title":"M","requires":["caps"]},{"title":"M","requires":["shift"]},{"title":"m","requires":["caps","shift"]},{"title":"µ","requires":["alt-gr"]}],",":[{"title":",","requires":[]},{"title":";","requires":["shift"]}],".":[{"title":".","requires":[]},{"title":":","requires":["shift"]}],"-":[{"title":"-","requires":[]},{"title":"_","requires":["shift"]}]},"layout":[["Esc",0.8,"F1","F2","F3","F4",0.8,"F5","F6","F7","F8",0.8,"F9","F10","F11","F12"],[0.1],{"main":{"alpha":[["\\","1","2","3","4","5","6","7","8","9","0","'","ì","Back"],["Tab","q","w","e","r","t","y","u","i","o","p","è","+",1,0.6],["Caps","a","s","d","f","g","h","j","k","l","ò","à","ù","Enter"],["LShift","<","z","x","c","v","b","n","m",",",".","-","RShift"],["LCtrl","Meta","LAlt","Space","AltGr","Menu","RCtrl"]],"movement":[["Ins","Home","PgUp"],["Del","End","PgDn"],[1],["Up"],["Left","Down","Right"]]}}],"keyWidths":{"Back":2,"Tab":1.75,"\\":1.25,"Caps":1.75,"Enter":1.5,"LShift":2.2,"RShift":2.2,"LCtrl":1.6,"Meta":1.6,"LAlt":1.6,"Space":6.4,"AltGr":1.6,"Menu":1.6,"RCtrl":1.6,"Ins":1.6,"Home":1.6,"PgUp":1.6,"Del":1.6,"End":1.6,"PgDn":1.6}};
var fr_fr_azerty = {"language":"fr_FR","type":"azerty","width":22,"keys":{"F1":65470,"F2":65471,"F3":65472,"F4":65473,"F5":65474,"F6":65475,"F7":65476,"F8":65477,"F9":65478,"F10":65479,"F11":65480,"F12":65481,"Space":" ","Esc":[{"title":"Echap","keysym":65307}],"Back":[{"title":"⟵","keysym":65288}],"Tab":[{"title":"↹","keysym":65289}],"Enter":[{"title":"Entrée","keysym":65293}],"Home":[{"title":"Origine","keysym":65360}],"PgUp":[{"title":"Pg préc.","keysym":65365}],"PgDn":[{"title":"Pg suiv.","keysym":65366}],"End":[{"title":"Fin","keysym":65367}],"Ins":[{"title":"Inser","keysym":65379}],"Del":[{"title":"Suppr","keysym":65535}],"Left":[{"title":"←","keysym":65361}],"Up":[{"title":"↑","keysym":65362}],"Right":[{"title":"→","keysym":65363}],"Down":[{"title":"↓","keysym":65364}],"Menu":[{"title":"Menu","keysym":65383}],"LShift":[{"title":"Shift","modifier":"shift","keysym":65505}],"RShift":[{"title":"Shift","modifier":"shift","keysym":65506}],"LCtrl":[{"title":"Ctrl","modifier":"control","keysym":65507}],"RCtrl":[{"title":"Ctrl","modifier":"control","keysym":65508}],"Caps":[{"title":"Caps","modifier":"caps","keysym":65509}],"LAlt":[{"title":"Alt","modifier":"alt","keysym":65513}],"AltGr":[{"title":"AltGr","modifier":"alt-gr","keysym":65027}],"Meta":[{"title":"Meta","modifier":"meta","keysym":65511}],"²":[{"title":"²","requires":[]}],"&":[{"title":"&","requires":[]},{"title":"1","requires":["shift"]}],"é":[{"title":"é","requires":[]},{"title":"2","requires":["shift"]},{"title":"~","requires":["alt-gr"]}],"\"":[{"title":"\"","requires":[]},{"title":"3","requires":["shift"]},{"title":"#","requires":["alt-gr"]}],"'":[{"title":"'","requires":[]},{"title":"4","requires":["shift"]},{"title":"{","requires":["alt-gr"]}],"(":[{"title":"(","requires":[]},{"title":"5","requires":["shift"]},{"title":"[","requires":["alt-gr"]}],"-":[{"title":"-","requires":[]},{"title":"6","requires":["shift"]},{"title":"|","requires":["alt-gr"]}],"è":[{"title":"è","requires":[]},{"title":"7","requires":["shift"]},{"title":"`","requires":["alt-gr"]}],"_":[{"title":"_","requires":[]},{"title":"8","requires":["shift"]},{"title":"\\","requires":["alt-gr"]}],"ç":[{"title":"ç","requires":[]},{"title":"9","requires":["shift"]},{"title":"^","requires":["alt-gr"]}],"à":[{"title":"à","requires":[]},{"title":"0","requires":["shift"]},{"title":"@","requires":["alt-gr"]}],")":[{"title":")","requires":[]},{"title":"°","requires":["shift"]},{"title":"]","requires":["alt-gr"]}],"=":[{"title":"=","requires":[]},{"title":"+","requires":["shift"]},{"title":"}","requires":["alt-gr"]}],"^":[{"title":"^","requires":[]},{"title":"¨","requires":["shift"]}],"$":[{"title":"$","requires":[]},{"title":"£","requires":["shift"]},{"title":"¤","requires":["alt-gr"]}],"ù":[{"title":"ù","requires":[]},{"title":"%","requires":["shift"]}],"*":[{"title":"*","requires":[]},{"title":"µ","requires":["shift"]}],"<":[{"title":"<","requires":[]},{"title":">","requires":["shift"]}],",":[{"title":",","requires":[]},{"title":"?","requires":["shift"]}],";":[{"title":";","requires":[]},{"title":".","requires":["shift"]}],":":[{"title":":","requires":[]},{"title":"/","requires":["shift"]}],"!":[{"title":"!","requires":[]},{"title":"§","requires":["shift"]}],"a":[{"title":"a","requires":[]},{"title":"A","requires":["caps"]},{"title":"A","requires":["shift"]},{"title":"a","requires":["caps","shift"]}],"z":[{"title":"z","requires":[]},{"title":"Z","requires":["caps"]},{"title":"Z","requires":["shift"]},{"title":"z","requires":["caps","shift"]}],"e":[{"title":"e","requires":[]},{"title":"E","requires":["caps"]},{"title":"E","requires":["shift"]},{"title":"e","requires":["caps","shift"]},{"title":"€","requires":["alt-gr"]}],"r":[{"title":"r","requires":[]},{"title":"R","requires":["caps"]},{"title":"R","requires":["shift"]},{"title":"r","requires":["caps","shift"]}],"t":[{"title":"t","requires":[]},{"title":"T","requires":["caps"]},{"title":"T","requires":["shift"]},{"title":"t","requires":["caps","shift"]}],"y":[{"title":"y","requires":[]},{"title":"Y","requires":["caps"]},{"title":"Y","requires":["shift"]},{"title":"y","requires":["caps","shift"]}],"u":[{"title":"u","requires":[]},{"title":"U","requires":["caps"]},{"title":"U","requires":["shift"]},{"title":"u","requires":["caps","shift"]}],"i":[{"title":"i","requires":[]},{"title":"I","requires":["caps"]},{"title":"I","requires":["shift"]},{"title":"i","requires":["caps","shift"]}],"o":[{"title":"o","requires":[]},{"title":"O","requires":["caps"]},{"title":"O","requires":["shift"]},{"title":"o","requires":["caps","shift"]}],"p":[{"title":"p","requires":[]},{"title":"P","requires":["caps"]},{"title":"P","requires":["shift"]},{"title":"p","requires":["caps","shift"]}],"q":[{"title":"q","requires":[]},{"title":"Q","requires":["caps"]},{"title":"Q","requires":["shift"]},{"title":"q","requires":["caps","shift"]}],"s":[{"title":"s","requires":[]},{"title":"S","requires":["caps"]},{"title":"S","requires":["shift"]},{"title":"s","requires":["caps","shift"]}],"d":[{"title":"d","requires":[]},{"title":"D","requires":["caps"]},{"title":"D","requires":["shift"]},{"title":"d","requires":["caps","shift"]}],"f":[{"title":"f","requires":[]},{"title":"F","requires":["caps"]},{"title":"F","requires":["shift"]},{"title":"f","requires":["caps","shift"]}],"g":[{"title":"g","requires":[]},{"title":"G","requires":["caps"]},{"title":"G","requires":["shift"]},{"title":"g","requires":["caps","shift"]}],"h":[{"title":"h","requires":[]},{"title":"H","requires":["caps"]},{"title":"H","requires":["shift"]},{"title":"h","requires":["caps","shift"]}],"j":[{"title":"j","requires":[]},{"title":"J","requires":["caps"]},{"title":"J","requires":["shift"]},{"title":"j","requires":["caps","shift"]}],"k":[{"title":"k","requires":[]},{"title":"K","requires":["caps"]},{"title":"K","requires":["shift"]},{"title":"k","requires":["caps","shift"]}],"l":[{"title":"l","requires":[]},{"title":"L","requires":["caps"]},{"title":"L","requires":["shift"]},{"title":"l","requires":["caps","shift"]}],"m":[{"title":"m","requires":[]},{"title":"M","requires":["caps"]},{"title":"M","requires":["shift"]},{"title":"m","requires":["caps","shift"]}],"w":[{"title":"w","requires":[]},{"title":"W","requires":["caps"]},{"title":"W","requires":["shift"]},{"title":"w","requires":["caps","shift"]}],"x":[{"title":"x","requires":[]},{"title":"X","requires":["caps"]},{"title":"X","requires":["shift"]},{"title":"x","requires":["caps","shift"]}],"c":[{"title":"c","requires":[]},{"title":"C","requires":["caps"]},{"title":"C","requires":["shift"]},{"title":"c","requires":["caps","shift"]}],"v":[{"title":"v","requires":[]},{"title":"V","requires":["caps"]},{"title":"V","requires":["shift"]},{"title":"v","requires":["caps","shift"]}],"b":[{"title":"b","requires":[]},{"title":"B","requires":["caps"]},{"title":"B","requires":["shift"]},{"title":"b","requires":["caps","shift"]}],"n":[{"title":"n","requires":[]},{"title":"N","requires":["caps"]},{"title":"N","requires":["shift"]},{"title":"n","requires":["caps","shift"]}]},"layout":[["Esc",0.5,"F1","F2","F3","F4",0.7,"F5","F6","F7","F8",0.7,"F9","F10","F11","F12"],[0.1],{"main":{"alpha":[["²","&","é","\"","'","(","-","è","_","ç","à",")","=","Back"],["Tab","a","z","e","r","t","y","u","i","o","p","^","$",1,0.8],["Caps","q","s","d","f","g","h","j","k","l","m","ù","*","Enter"],["LShift","<","w","x","c","v","b","n",",",";",":","!","RShift"],["LCtrl","Meta","LAlt","Space","AltGr","Menu","RCtrl"]],"movement":[["Ins","Home","PgUp"],["Del","End","PgDn"],[1],["Up"],["Left","Down","Right"]]}}],"keyWidths":{"Esc":1.2,"Back":2,"Tab":1.3,"Caps":1.3,"Enter":1.7,"LShift":2,"RShift":2.1,"LCtrl":1.6,"Meta":1.6,"LAlt":1.6,"Space":6.1,"AltGr":1.6,"Menu":1.6,"RCtrl":1.6,"Ins":1.6,"Home":1.6,"PgUp":1.6,"Del":1.6,"End":1.6,"PgDn":1.6}};
