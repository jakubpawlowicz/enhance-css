/**
* Enhance-css - https://github.com/GoalSmashers/enhance-css
* Released under the terms of MIT license
*
* Copyright (C) 2011-2014 GoalSmashers.com
*/

/* jshint latedef: false */

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var crypto = require('crypto');
var querystring = require('querystring');

var isWindows = process.platform == 'win32';

var EnhanceCSS = module.exports = function EnhanceCSS(options) {
  options = options || {};

  if (!(this instanceof EnhanceCSS))
    return new EnhanceCSS(options);

  options.stamp = 'stamp' in options ?
    options.stamp :
    true;

  this.options = options;
  this.urlPattern = /url\(([^\)]+)\)/g;
  this.hostsCycle = null;
};

EnhanceCSS.prototype.process = function(css, callback) {
  var self = this;
  var options = this.options;
  var missing = {};
  var embedUrls = {};
  var allUrls = [];
  var data = {
    original: css,
    warnings: []
  };

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

    if (pathInfo.relative.indexOf('data:image') === 0)
      return match;

    if (pathInfo.remote) {
      addWarning(data.warnings, pathInfo, 'skipped because is not local');
      return match;
    }

    // Break early if file does not exist
    if (!pathInfo.exists) {
      addWarning(data.warnings, pathInfo, 'does not exist');
      missing[pathInfo.relative] = 1;
      return match;
    }

    // Break unless ?embed param or there's more than one such image
    var moreThanOnce = embedUrls[pathInfo.relative] > 1;
    if (!options.forceEmbed && (pathInfo.query.embed === undefined || moreThanOnce)) {
      if (moreThanOnce)
        addWarning(data.warnings, pathInfo, 'set for embedding more than once');
      if (options.stamp)
        addFileStamp(pathInfo, options);
      return ['url(', (self.nextAssetHost() || ''), pathInfo.relative, ')'].join('');
    }

    var type = path.extname(pathInfo.relative).substring(1);
    if (type == 'jpg')
      type = 'jpeg';
    if (type == 'svg')
      type = 'svg+xml';

    // Break unless unsupported type
    if (!/(jpeg|gif|png|svg\+xml)/.test(type)) {
      addWarning(data.warnings, pathInfo, 'skipped because of unknown content type');
      return match;
    }

    var base64 = fs.readFileSync(pathInfo.absolute).toString('base64');

    return 'url(data:image/' + type + ';base64,' + base64 + ')';
  });

  // Get not embedded version (aka <= IE7)
  if (options.noEmbedVersion) {
    data.notEmbedded = {};
    data.notEmbedded.plain = css.replace(this.urlPattern, function(match, url) {
      var pathInfo = self.parseImageUrl(url);

      // Break early if file does not exist
      if (!pathInfo.exists)
        return match;

      if (options.stamp)
        addFileStamp(pathInfo, options);

      return ['url(', (self.nextAssetHost() || ''), pathInfo.relative, ')'].join('');
    });
  }

  if (options.cryptedStamp) {
    allUrls.forEach(function(url) {
      addFileStamp(url, options);
    });
  }

  // Update missing & duplicates lists
  data.missing = Object.keys(missing);
  data.duplicates = [];
  for (var key in embedUrls) {
    if (hasOwnProperty.call(embedUrls, key)) {
      if (embedUrls[key] > 1)
        data.duplicates.push(key);
    }
  }

  // Create gzipped version too if requested
  if (options.pregzip) {
    var count = options.noEmbedVersion ? 2 : 1;
    var compress = function(type) {
      zlib.gzip(data[type].plain, function(error, result) {
        data[type].compressed = result;
        if (--count === 0)
          callback(null, data);
      });
    };

    compress('embedded');
    if (options.noEmbedVersion)
      compress('notEmbedded');

    return;
  }

  if (callback)
    callback(null, data);
  else
    return data;
};

EnhanceCSS.prototype.parseImageUrl = function(url) {
  var remote = /^(http:\/\/|https:\/\/|\/\/)/.test(url);
  var tokens = url.replace(/['"]/g, '').split('?');
  var query = tokens[1] ? querystring.parse(tokens[1]) : {};
  var imagePath = remote ?
    tokens[0] :
    path.normalize(tokens[0]);
  var absolutePath = remote ?
    imagePath :
    path.join(this.options.rootPath, imagePath);

  if (isWindows && imagePath.indexOf('data:image') < 0)
    imagePath = imagePath.replace(/\\/g, '/');

  return {
    remote: remote,
    relative: imagePath,
    absolute: absolutePath,
    query: query,
    exists: remote ? false : fs.existsSync(absolutePath)
  };
};

EnhanceCSS.prototype.nextAssetHost = function() {
  var hosts = this.options.assetHosts;
  if (!hosts)
    return null;
  if (hosts.indexOf('[') == -1)
    return fixAssetHost(hosts);

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

        if (this.index == this.cycleList.length)
          this.index = 0;
        return this.cycleList[this.index++];
      }
    };
  }

  return fixAssetHost(this.hostsCycle.next());
};

function fixAssetHost(host) {
  if (/^http:\/\//.test(host) || /^https:\/\//.test(host) || /^\/\//.test(host))
    return host;

  return '//' + host;
}

function addFileStamp(pathInfo, options) {
  if (!fs.existsSync(pathInfo.absolute))
    return;

  if (options.cryptedStamp && (pathInfo.query.embed === undefined || options.noEmbedVersion)) {
    var source = fs.readFileSync(pathInfo.absolute);
    var encrypted = crypto.createHash('md5');
    var toStampedPath = function(path) {
      var extensionDotIndex = path.lastIndexOf('.');
      return path.substring(0, extensionDotIndex) + '-' + stamp + '.' + path.substring(extensionDotIndex + 1);
    };

    encrypted.update(source.toString('utf8'));
    var stamp = encrypted.digest('hex');
    var targetPath = toStampedPath(pathInfo.absolute);

    if (!fs.existsSync(targetPath))
      fs.writeFileSync(targetPath, source);

    pathInfo.relative = toStampedPath(pathInfo.relative);
  } else {
    pathInfo.relative += '?' + Date.parse(fs.statSync(pathInfo.absolute).mtime) / 1000;
  }
}

function addWarning(warnings, pathInfo, reason) {
  var message = 'File \'' + pathInfo.relative + '\' ' + reason + '.';
  if (warnings.indexOf(message) === -1)
    warnings.push(message);
}
