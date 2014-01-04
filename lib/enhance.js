/**
* Enhance-css - https://github.com/GoalSmashers/enhance-css
* Released under the terms of MIT license
*
* Copyright (C) 2011-2014 GoalSmashers.com
*/

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var crypto = require('crypto');
var querystring = require('querystring');

var isWindows = process.platform == 'win32';

module.exports = function EnhanceCSS(options) {
  options.stamp = 'stamp' in options ? options.stamp : true;

  var urlPattern = /url\(([^\)]+)\)/g;
  var hostsCycle = null;

  var process = function(css, callback) {
    var missing = {};
    var data = { original: css };
    var embedUrls = {};
    var allUrls = [];

    // Only to find duplicates
    (css.match(urlPattern) || []).forEach(function(url) {
      var pathInfo = parseImageUrl(url.substring(4, url.length - 1));

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
    data.embedded.plain = css.replace(urlPattern, function(match, url) {
      var pathInfo = parseImageUrl(url);

      // Break early if file does not exist
      if (!pathInfo.exists) {
        missing[pathInfo.relative] = 1;
        return match;
      }

      // Break unless ?embed param or there's more than one such image
      if (pathInfo.query.embed === undefined || embedUrls[pathInfo.relative] > 1) {
        if (options.stamp)
          addFileStamp(pathInfo);
        return ['url(', (nextAssetHost() || ''), pathInfo.relative, ')'].join('');
      }

      var type = path.extname(pathInfo.relative).substring(1);
      if (type == 'jpg')
        type = 'jpeg';
      if (type == 'svg')
        type = 'svg+xml';

      // Break unless unsupported type
      if (!/(jpeg|gif|png|svg\+xml)/.test(type))
        return match;

      var base64 = fs.readFileSync(pathInfo.absolute).toString('base64');

      return 'url(data:image/' + type + ';base64,' + base64 + ')';
    });

    // Get not embedded version (aka <= IE7)
    if (options.noEmbedVersion) {
      data.notEmbedded = {};
      data.notEmbedded.plain = css.replace(urlPattern, function(match, url) {
        var pathInfo = parseImageUrl(url);

        // Break early if file does not exist
        if (!pathInfo.exists)
          return match;

        if (options.stamp)
          addFileStamp(pathInfo);

        return ['url(', (nextAssetHost() || ''), pathInfo.relative, ')'].join('');
      });
    }

    if (options.cryptedStamp)
      allUrls.forEach(addFileStamp);

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

  var parseImageUrl = function(url) {
    var tokens = url.replace(/['"]/g, '').split('?');
    var query = tokens[1] ? querystring.parse(tokens[1]) : {};
    var imagePath = path.normalize(tokens[0]);
    var absolutePath = path.join(options.rootPath, imagePath);

    if (isWindows && imagePath.indexOf('data:image') < 0)
      imagePath = imagePath.replace(/\\/g, '/');

    return {
      relative: imagePath,
      absolute: absolutePath,
      query: query,
      exists: fs.existsSync(absolutePath)
    };
  };

  var nextAssetHost = function() {
    var hosts = options.assetHosts;
    if (!hosts)
      return null;
    if (hosts.indexOf('[') == -1)
      return fixAssetHost(hosts);

    if (!hostsCycle) {
      hostsCycle = {
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

    return fixAssetHost(hostsCycle.next());
  };

  var fixAssetHost = function(host) {
    if (/^http:\/\//.test(host) || /^https:\/\//.test(host) || /^\/\//.test(host))
      return host;

    return '//' + host;
  };

  var addFileStamp = function(pathInfo) {
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
  };

  return {
    nextAssetHost: nextAssetHost,
    parseImageUrl: parseImageUrl,
    process: process
  };
};
