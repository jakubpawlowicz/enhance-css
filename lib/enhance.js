var fs = require('fs'),
  querystring = require('querystring');

exports.enhance = {
  process: function(css, options) {
    return css.replace(/url\(([^\)]+)\)/g, function(match, url) {
      var tokens = url.split('?');
      var imagePath = tokens[0];
      var query = querystring.parse(tokens[1] || '');
      if (query['embed'] === undefined) return match;
      
      var pathTokens = imagePath.split('.');
      var extension = pathTokens[pathTokens.length - 1];
      var type = '';
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          type = 'jpeg';
          break;
        case 'png':
          type = 'png';
      }
      
      var base64 = fs.readFileSync(options.rootPath + imagePath).toString('base64');
      
      return "url(data:image/" + type + ";base64," + base64 + ")";
    });
  }
};