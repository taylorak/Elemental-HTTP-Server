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
    //setupNext(req, res);
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
      handler: handler,
      nextHandler: null,
      next: null
    }

    routes.push(route);
  }

  function setupNext(request, response) {
    for(var i = routes.length - 1; i > 0; i--) {
      routes[i - 1].next = routes[i - 1].nextHandler.bind(null, request, response, routes[i].next);
    }
  }

  function handleRequest(request, response) {
    console.log('handle request');

    var matchingRoutes = [];

    for(var i = 0; i < routes.length; i++) {
      if(routes[i].url.test(request.url)) {
        if(routes[i].method.test(request.method)) {
          matchingRoutes.push(routes[i]);
        }
      }
    }

    for(var j = matchingRoutes.length - 1; j > 0; j--) {
      matchingRoutes[j - 1].next = matchingRoutes[j].handler.bind(null, request, response, matchingRoutes[j].next);
    }
    console.log(matchingRoutes);
    matchingRoutes[0].handler(request, response, matchingRoutes[0].next);
  }

  function listen(port, host, callback) {
    server.listen(port, callback);
    //console.log(routes);
  }

  return {
    use : use,
    listen : listen
  }
}


function render(template, params, cb) {
  var readableStream = fs.createReadStream('templates/' + template + '.html');
  var templateString = '';

  readableStream.on('data', function(data) {
    templateString += data;
  })

  readableStream.on('error', function(err) {
    cb(err, templateString);
  })

  readableStream.on('end', function() {
    var re = /\[\[(.*)\]\]/
    var match;
    while(match = re.exec(templateString)) {
      var replacement = params[match[1]];
      if(replacement === undefined) {
        replacement = '';
      }
      templateString = templateString.replace(match[0], replacement)
    }
    cb(null, templateString);
  })

}

var server = shittyRouter();

server.use('*', '*', function(request, response, next) {
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

    request.formData = formData;
    next();

  })

})

server.use('POST', '/elements', function(request, response, next) {
  console.log('POST');
  render('element', request.formData, function(err, template) {

    var outputPath = root + '/' + request.formData.elementName + '.html'
    fs.stat(outputPath, function(err, stat) {
      if(err) {
        if(err.code === 'ENOENT') {
          fs.writeFile(outputPath, template, function(err) {
            if(err) return serverError(request, response);
            fs.readdir(root, function(err, files) {
              var filteredFiles = files.filter(function(file) {
                return(
                  file !== '.keep' &&
                  file !== 'css' &&
                  file !== 'index.html' &&
                  file !== '404.html'
                )
              }).reduce(function(prev, curr) {
                prev.elementList += '<li><a href="/' + curr + '">' + curr.replace('.html', '') +'</a></li>';
                prev.numElements++;
                return prev;
              }, { elementList : '', numElements: 0 });

              render('index', filteredFiles, function(err, template) {
                fs.writeFile("./public/index.html", template, function(err) {
                  if(err) return serverError(request, response);
                })
              })
            })
            response.writeHead('200', 'OK', {'Content-Type' : 'application/json'});
            response.write(JSON.stringify({ sucess : true }));
            response.end();
          });
        } else {
          return serverError(request, response);
        }
      } else {
        response.writeHead('500', 'SERVER ERROR', {'Content-Type' : 'application/json'});
        response.write(JSON.stringify({ error : 'resource ' + request.url + ' already exists' }));
        response.end();
        return;
      }
    })

  })
})

server.use('PUT', '/.*', function(request, response, next) {
  var outputPath = root + request.url;

  fs.stat(outputPath, function(err, stat) {
    if(err) {
      if(err.code === 'ENOENT') {
        response.writeHead('500', 'SERVER ERROR', {'Content-Type' : 'application/json'})
        response.write('{ "error" : "resource ' + request.url + 'does not exist" }');
        response.end();
        return;
      }
    }

    render('element', request.formData, function(err, template) {
      fs.writeFile(outputPath, template, function(err) {
        if(err) return serverError(request, response);
        response.writeHead('200', 'OK', {'Content-Type' : 'application/json'});
        response.write(JSON.stringify({ sucess : true }));
        response.end();
      })
    })

  })
})

server.use('DELETE', '/.*', function(request, response, next) {
  console.log('DELETE');
  fs.stat(root + request.url, function(err, stat) {
    if(err) {
      response.writeHead('500', 'SERVER ERROR', {'Content-Type' : 'application/json'})
      response.write('{ "error" : "resource ' + request.url + 'does not exist" }');
      response.end();
      return;
    }

    fs.unlink(root + request.url, function(err) {
      if(err) {
        return serverError();
      }

      response.writeHead('200', 'OK', {'Content-Type' : 'application/json'});
      response.write('{"success" : "true"}');
      response.end();
    })

  })

})

server.use('GET', '/.*', function(request, response, next) {
  console.log('GET');

  if(request.url === '/') {
    request.url = '/index.html';
  }

  var extension = request.url.substr(request.url.lastIndexOf('.') + 1);

  fs.stat(root + request.url, function(err, stat) {
    if(err) {
      if(err.code === 'ENOENT') {
        return notFound(request, response);
      } else {
        return serverError(request, response);
      }
    }

    response.writeHead('200', 'OK', {
        'Date' : new Date(),
        'Content-Type' : contentType[extension],
        'Content-Length' : stat.size
      });

    var readableStream = fs.createReadStream(root + request.url);
    readableStream.pipe(response);

    readableStream.on('error', function() {
      return serverError(request, response);
    })

    readableStream.on('end', function() {
      response.end();
    })

  })

})

server.use('*','*', function(request, response, next) {
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

function serverError(request, response) {
  response.write('HTTP/1.1 500 SERVER ERROR\r\n');
  response.write('Date: ' + new Date() + '\r\n');
  response.write('\r\n')
  response.end();
}