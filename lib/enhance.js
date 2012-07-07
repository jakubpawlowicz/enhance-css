var fs = require('fs'),
  path = require('path'),
  gzip = require('gzip'),
  crypto = require('crypto'),
  querystring = require('querystring');

var EnhanceCSS = function(options) {
  this.options = options;
};

EnhanceCSS.prototype = {
  urlPattern: /url\(([^\)]+)\)/g,
  process: function(css, callback) {
    var self = this,
      missing = {},
      data = { original: css },
      embedUrls = {},
      allUrls = [];

    // Only to find duplicates
    (css.match(this.urlPattern) || []).forEach(function(url) {
      var pathInfo = self.parseImageUrl(url.substring(4, url.length - 1));

      if (pathInfo.query.embed !== undefined) {
        if (embedUrls[pathInfo.relative])
          embedUrls[pathInfo.relative]++;
        else
          embedUrls[pathInfo.relative] = 1;
      }

      allUrls.push(pathInfo);
    });

    // Get embedded version
    data.embedded = {};
    data.embedded.plain = css.replace(this.urlPattern, function(match, url) {
      var pathInfo = self.parseImageUrl(url);

      // Break early if file does not exist
      if (!pathInfo.exists) {
        missing[pathInfo.relative] = 1;
        return match;
      }

      // Break unless ?embed param or there's more than one such image
      if (pathInfo.query.embed === undefined || embedUrls[pathInfo.relative] > 1) {
        var assetHost = self.nextAssetHost();
        self._addFileStamp(pathInfo);
        return ['url(', (assetHost == null ? '' : '//' + assetHost), pathInfo.relative, ')'].join('');
      }

      var type = path.extname(pathInfo.relative).substring(1);
      if (type == 'jpg') type = 'jpeg';
      if (type == 'svg') type = 'svg+xml';

      // Break unless unsupported type
      if (!/(jpeg|gif|png|svg\+xml)/.test(type)) return match;

      var base64 = fs.readFileSync(pathInfo.absolute).toString('base64');

      return "url(data:image/" + type + ";base64," + base64 + ")";
    });

    // Get not embedded version (aka <= IE7)
    if (this.options.noEmbedVersion) {
      data.notEmbedded = {};
      data.notEmbedded.plain = css.replace(this.urlPattern, function(match, url) {
        var pathInfo = self.parseImageUrl(url);

        // Break early if file does not exist
        if (!pathInfo.exists) return match;

        var assetHost = self.nextAssetHost();
        self._addFileStamp(pathInfo);
        return ['url(', (assetHost == null ? '' : '//' + assetHost), pathInfo.relative, ')'].join('');
      });
    }

    if (this.options.cryptedStamp) {
      allUrls.forEach(function(pathInfo) {
        self._addFileStamp(pathInfo);
      });
    }

    // Update missing & duplicates lists
    data.missing = Object.keys(missing);
    data.duplicates = [];
    for (var key in embedUrls) {
      if (hasOwnProperty.call(embedUrls, key)) {
        if (embedUrls[key] > 1) data.duplicates.push(key);
      }
    }

    // Create gzipped version too if requested
    if (this.options.pregzip) {
      var count = this.options.noEmbedVersion ? 2 : 1;
      var compress = function(type) {
        var compressed = [],
          outputLength = 0;
        gzip(data[type].plain)
          .on('data', function(chunk) {
            compressed.push(chunk);
            outputLength += chunk.length;
          })
          .on('end', function() {
            dataProcessor(type)(compressed, outputLength);
            if (--count == 0) callback(null, data);
          });
      };

      var dataProcessor = function(type) {
        return function(compressedBuffers, outputLength) {
          data[type].compressed = new Buffer(outputLength);

          var index = 0;
          compressedBuffers.forEach(function(buffer) {
            buffer.copy(data[type].compressed, index);
            index += buffer.length;
          });
        };
      };

      compress('embedded');
      if (this.options.noEmbedVersion) compress('notEmbedded');

      return;
    }

    if (callback) callback(null, data);
    else return data;
  },

  parseImageUrl: function(url) {
    var tokens = url.replace(/['"]/g, '').split('?');
    var query = tokens[1] ? querystring.parse(tokens[1]) : {};
    var absolutePath = path.normalize(this.options.rootPath + tokens[0]);
    var imagePath = absolutePath.substring(this.options.rootPath.length);

    return {
      relative: imagePath,
      absolute: absolutePath,
      query: query,
      exists: fs.existsSync(absolutePath)
    };
  },

  nextAssetHost: function() {
    var hosts = this.options.assetHosts;
    if (!hosts) return null;
    if (hosts.indexOf('[') == -1) return hosts;

    if (!this.hostsCycle) {
      this.hostsCycle = {
        next: function() {
          if (!this.cycleList) {
            var cycleList = [];
            var start = hosts.indexOf('[');
            var end = hosts.indexOf(']');
            var pattern = hosts.substring(start + 1, end);

            pattern.split(',').forEach(function(version) {
              cycleList.push(hosts.replace(/\[([^\]])+\]/, version));
            });

            this.cycleList = cycleList;
            this.index = 0;
          }

          if (this.index == this.cycleList.length) this.index = 0;
          return this.cycleList[this.index++];
        }
      };
    }

    return this.hostsCycle.next();
  },

  _addFileStamp: function(pathInfo) {
    if (!fs.existsSync(pathInfo.absolute)) return;

    if (this.options.cryptedStamp && (pathInfo.query.embed === undefined || this.options.noEmbedVersion)) {
      var source = fs.readFileSync(pathInfo.absolute),
        encrypted = crypto.createHash('md5'),
        toStampedPath = function(path) {
          var extensionDotIndex = path.lastIndexOf('.');
          return path.substring(0, extensionDotIndex) + '-' + stamp + '.' + path.substring(extensionDotIndex + 1);
        };

      encrypted.update(source.toString('utf8'));
      var stamp = encrypted.digest('hex'),
        targetPath = toStampedPath(pathInfo.absolute);

      if (!fs.existsSync(targetPath))
        fs.writeFileSync(targetPath, source);

      pathInfo.relative = toStampedPath(pathInfo.relative);
    } else {
      pathInfo.relative += "?" + Date.parse(fs.statSync(pathInfo.absolute).mtime) / 1000;
    }
  }
};

module.exports = EnhanceCSS;