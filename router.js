var http = require('http');

function router() {
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
      handler: handler,
      nextHandler: null,
      next: null
    }

    routes.push(route);
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
  }

  return {
    use : use,
    listen : listen
  }
}

module.exports = router;