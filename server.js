var http = require('http');
var fs = require('fs');

var root = './public';
var contentType = {
  'html' : 'text/html',
  'css' : 'text/css'
}

function shittyRouter() {
  var routes = [];

  var server = http.createServer(function(req, res) {
    handleRequest(req, res);
  })

  function use(method, uri, handler) {

    if(method === '*') {
      var uriPattern = new RegExp('.*');
    } else {
      var uriPattern = new RegExp('^' + uri + '$');
    }

    if(uri === '*') {
      var methodPattern = new RegExp('.*');
    } else {
      var methodPattern = new RegExp('^' + method + '$');
    }

    var route = {
      method: methodPattern,
      url: uriPattern,
      handler: handler
    }

    routes.push(route);
  }

  function handleRequest(request, response) {
    console.log('handle request');

    for(var i = 0; i < routes.length; i++) {
      if(routes[i].url.test(request.url)) {
        if(routes[i].method.test(request.method)) {
          routes[i].handler(request, response);
          return;
        }
      }
    }
  }

  function listen(port, host, callback) {
    server.listen(port, callback);
    console.log(routes);
  }

  return {
    use : use,
    listen : listen
  }
}


function render(template, params) {
  var readableStream = fs.createReadStream('templates/' + template + '.html');
  var templateString = '';

  readableStream.on('data', function(data) {
    templateString += data;
  })

  readableStream.on('end', function() {
    var re = /\[\[(.*)\]\]/
    var match;
    while(match = re.exec(templateString)) {
      templateString = templateString.replace(match[0], params[match[1]])
    }
    return templateString;
  })

}

var server = shittyRouter();

server.use('POST', '/elements', function(request, response) {
  var formData = {};

  var message = '';
  request.on('data', function(data) {
    message += data.toString();
  })

  request.on('end', function() {
    var formEntries = message.split('&');
    for(var i = 0; i < formEntries.length; i++) {
      var entryValues = formEntries[i].split('=');
      formData[entryValues[0]] = entryValues[1];
    }

    console.log('POST');
    console.log(render('element', formData));
    response.writeHead('200', 'OK', {'Content-Type' : 'application/json'});
    response.write('{"HELLO" : "GOODBYE"}');
    response.end();
  })

})

server.use('GET', '/.*', function(request, response) {
  console.log(request.url);
  if(request.url === '/') {
    request.url = '/index.html';
  }

  var extension = request.url.substr(request.url.lastIndexOf('.') + 1);

  var length;
  fs.stat(root + request.url, function(err, stat) {
    length = stat.size;
  })
  response.writeHead('200', 'OK', {
      'Date' : new Date(),
      'Content-Type' : contentType[extension],
      'Content-Length' : Buffer.byteLength(length)
    });

  var readableStream = fs.createReadStream(root + request.url);
  readableStream.pipe(response);

  readableStream.on('end', function() {
    response.end();
  })
})

server.use('*','*', function(request, response) {
  console.log('NOT FOUND');
  notFound(request, response);
})

server.listen(8080, 'localhost', function() {
  console.log('Server listening on: http://localhost:%s', this.port)
});


function notFound(request, response) {
  var readableStream = fs.createReadStream('public/404.html');
  response.writeHead('404', 'NOT FOUND', {});
  readableStream.pipe(response);

  readableStream.on('end', function() {
    response.end();
  })
}