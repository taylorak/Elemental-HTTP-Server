var http = require('http');
var fs = require('fs');

var root = '/public';
var contentType = {
  'html' : 'tex/html',
  'css' : 'text/css'
}

function shittyRouter() {
  var routes = [];

  var server = http.createServer(function(req, res) {
    handleRequest(req, res);
  })

  function use(method, pattern, handler) {
    var pattern = new RegExp('^' + pattern + '$');

    var route = {
      method: method,
      pattern: pattern,
      handler: handler
    }

    routes.push(route);
  }

  function handleRequest(request, response) {
    console.log('handle request');
    routes.forEach(function(route) {
      if(route.pattern.test(request.url)) {
        if(route.method === request.method) {
          route.handler(request, response);
        }
      }
    })
  }

  function listen(port, host, callback) {
    server.listen(port, callback);
  }

  return {
    use : use,
    listen : listen
  }
}

var server = shittyRouter();

server.use('POST', '/elements', function(request, response) {
  console.log(request.headers);
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

    response.writeHead('200', 'OK', {'Content-Type' : 'application/json'});
    response.write('{"HELLO" : "GOODBYE"}');
    response.end();
  })

})

server.listen(8080, 'localhost', function() {
  console.log('Server listening on: http://localhost:%s', this.port)
});

// var server = http.createServer(function(req, res) {

//   var uri = req.url.split('?').shift();

//   handleRequest('GET', '/elements', function(request, response) {

//   })

//   if(req.method === 'POST') {
//     var writeStream = fs.createWriteStream('data.txt', 'utf8');
//     req.pipe(writeStream);
//     res.writeHead('200', 'OK', {'Content-Type' : 'application/json'});
//     res.write('{HELLO : GOODBYE}');
//     res.end();

//     req.on('end', function() {
//       console.log('end request');
//       writeStream.end();
//     })
//   }

//   fs.stat(uri, function(err, stat) {
//     if(err) {
//       if(err.code === 'ENOENT') {
//         console.log('not found error');
//         notFound(request);
//       } else {
//         console.log("server error");
//         serverError();
//       }
//     }
//     else {


//     }

//   })

//   //var queryObj = url.parse(req.url);
//   // console.log(req.headers);
//   // console.log(req.method);
//   // var uri = req.url.split('?').shift();
//   //var query = req.url.split('?').splice(1);
//   // console.log(query);
//   //console.log(queryObj.query);

//   // switch(uri) {
//   //   case '/elements':
//   //     if(req.method === 'POST') {
//   //       console.log('post');
//   //       res.writeHead('200', 'OK', {'Content-Type' : 'application/json'})
//   //       req.pipe(res);
//   //       req.on('end', function(){
//   //         res.end();
//   //       })
//   //     }
//   //     break;
//   //   default:
//   // }

// })

// server.listen(PORT, function() {
//   console.log('Server listening on: http://localhost:%s', PORT)
// })