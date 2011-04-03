var fs = require('fs'),
  path = require('path'),
  gzip = require('gzip'),
  querystring = require('querystring');

var EnhanceCSS = function(options) {
  this.options = options;
  this.hostsCycleCycle = null;
};

EnhanceCSS.prototype = {
  urlPattern: /url\(([^\)]+)\)/g,
  process: function(css, callback) {
    var self = this,
      missing = {},
      data = { original: css },
      allUrls = {};
    
    // Only to find duplicates
    (css.match(this.urlPattern) || []).forEach(function(url) {
      var pathInfo = self.parseImageUrl(url.substring(4, url.length - 1));
      
      if (pathInfo.query.embed !== undefined) {
        if (allUrls[pathInfo.relative])
          allUrls[pathInfo.relative]++;
        else
          allUrls[pathInfo.relative] = 1;
      }
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
      if (pathInfo.query.embed === undefined || allUrls[pathInfo.relative] > 1) {
        var mtime = Date.parse(fs.statSync(pathInfo.absolute).mtime) / 1000;
        var assetHost = self.nextAssetHost();
        return ['url(', (assetHost == null ? '' : '//' + assetHost), pathInfo.relative, '?', mtime, ')'].join('');
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
      
        var mtime = Date.parse(fs.statSync(pathInfo.absolute).mtime) / 1000;
        var assetHost = self.nextAssetHost();
        return ['url(', (assetHost == null ? '' : '//' + assetHost), pathInfo.relative, '?', mtime, ')'].join('');
      });
    }
    
    // Update missing & duplicates lists
    data.missing = Object.keys(missing);
    data.duplicates = [];
    for (var key in allUrls) {
      if (hasOwnProperty.call(allUrls, key)) {
        if (allUrls[key] > 1) data.duplicates.push(key);
      }
    }
    
    // Create gzipped version too if requested
    if (this.options.pregzip) {
      var count = this.options.noEmbedVersion ? 2 : 1;
      var compress = function(content, saveCallback) {
        gzip(content).on('data', saveCallback);
      };
      
      compress(data.embedded.plain, function(compressed) {
        data.embedded.compressed = compressed;
        if (--count == 0) callback(null, data);
      });
      if (this.options.noEmbedVersion) {
        compress(data.notEmbedded.plain, function(compressed) {
          data.notEmbedded.compressed = compressed;
          if (--count == 0) callback(null, data);
        });
      }
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
      exists: path.existsSync(absolutePath)
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
  }
};

module.exports = EnhanceCSS;