var fs = require('fs');

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

module.exports = render;