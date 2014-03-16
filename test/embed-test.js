var vows = require('vows');
var assert = require('assert');
var fs = require('fs');
var zlib = require('zlib');
var path = require('path');
var exec = require('child_process').exec;
var crypto = require('crypto');
var EnhanceCSS = require('../lib/enhance.js');

var runOn = function(css, options) {
  options = options || {};
  options.rootPath = options.rootPath || process.cwd();

  return function() {
    return new EnhanceCSS(options).process(css, this.callback);
  };
};

var base64 = function(imageName) {
  return fs.readFileSync(process.cwd() + '/test/data/' + imageName).toString('base64');
};

var mtime = function(imageName) {
  return Date.parse(fs.statSync(process.cwd() + '/test/data/' + imageName).mtime) / 1000;
};

var cryptedStamp = function(imageName) {
  var data = fs.readFileSync(process.cwd() + '/test/data/' + imageName);
  var stamp = crypto.createHash('md5');
  stamp.update(data.toString('utf8'));
  return stamp.digest('hex');
};

vows.describe('embedding images').addBatch({
  'plain content': {
    topic: runOn('div{width:100px;height:50px}'),
    'should be left intact': function(data) {
      assert.equal(data.embedded.plain, data.original);
    },
    'should yield no warnings': function(data) {
      assert.deepEqual(data.warnings, []);
    }
  },
  'no embed': {
    topic: runOn('a{background:url(/test/data/gradient.jpg);}'),
    'should add a timestamp': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}');
    }
  },
  'unsupported': {
    topic: runOn('a{background:url(/test/data/gradient.webp?embed);}', { stamp: false }),
    'should be left intact': function(data) {
      assert.equal(data.embedded.plain, data.original);
    },
    'should yield a warning': function(data) {
      assert.deepEqual(data.warnings, ['File \'/test/data/gradient.webp\' skipped because of unknown content type.']);
    }
  },
  'urls with special characters #1': {
    topic: runOn('a{background:url("/test/data/gradient.jpg");}'),
    'should be processed': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}');
    }
  },
  'urls with special characters #2': {
    topic: runOn('a{background:url("/test/data/gradient.jpg");}'),
    'should be processed': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}');
    }
  },
  'already embedded': {
    topic: runOn('a{background:url(data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0D/h7BrH/AEG7P/vmH/Gj/h7BrH/Qbs/++Yf8a/kX/tbVf+gnqH/gbc//AByj+1tV/wCgnqH/AIG3P/xyv9DFmeH0/wCEnL+n/LqP9z+75/gux/qgsJlWn/CRl/T/AJcR/wCnfkf/2Q==)}'),
    'should not be changed': function(data) {
      assert.equal(data.embedded.plain, data.original);
    },
    'should yield no warnings': function(data) {
      assert.deepEqual(data.warnings, []);
    }
  },
  'same urls with mixed characters': {
    topic: runOn('a{background:url("/test/data/gradient.jpg?embed");} div{background:url(/test/data/gradient.jpg?embed);}'),
    'should not be embedded': function(data) {
      assert.equal(data.embedded.plain,
        'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');} ' +
        'div{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}');
    }
  },
  'url with relative parts': {
    topic: runOn('a{background:url(/test/data/../data/gradient.png)}'),
    'should be normalized': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}');
    }
  },
  'remote url': {
    'via http': {
      topic: runOn('a{background:url(http://pro.goalsmashers.com/test.png)}'),
      'should not be transformed': function(data) {
        assert.equal(data.embedded.plain, data.original);
      },
      'should yield a warning': function(data) {
        assert.deepEqual(data.warnings, ['File \'http://pro.goalsmashers.com/test.png\' skipped because is not local.']);
      }
    },
    'via https': {
      topic: runOn('a{background:url(https://pro.goalsmashers.com/test.png)}'),
      'should not be transformed': function(data) {
        assert.equal(data.embedded.plain, data.original);
      },
      'should yield a warning': function(data) {
        assert.deepEqual(data.warnings, ['File \'https://pro.goalsmashers.com/test.png\' skipped because is not local.']);
      }
    },
    'same protocol': {
      topic: runOn('a{background:url(//pro.goalsmashers.com/test.png)}'),
      'should not be transformed': function(data) {
        assert.equal(data.embedded.plain, data.original);
      },
      'should yield a warning': function(data) {
        assert.deepEqual(data.warnings, ['File \'//pro.goalsmashers.com/test.png\' skipped because is not local.']);
      }
    }
  },
  'one file to be embedded': {
    topic: function() {
      return function(type) {
        return 'a{background:url(/test/data/gradient.' + type + '?embed)}';
      };
    },
    'should give Base64 embedded jpg': function(css) {
      assert.equal(runOn(css('jpg'))().embedded.plain, 'a{background:url(data:image/jpeg;base64,' + base64('gradient.jpg') + ')}');
    },
    'should give Base64 embedded png': function(css) {
      assert.equal(runOn(css('png'))().embedded.plain, 'a{background:url(data:image/png;base64,' + base64('gradient.png') + ')}');
    },
    'should give Base64 embedded gif': function(css) {
      assert.equal(runOn(css('gif'))().embedded.plain, 'a{background:url(data:image/gif;base64,' + base64('gradient.gif') + ')}');
    },
    'should give Base64 embedded svg': function(css) {
      assert.equal(runOn(css('svg'))().embedded.plain, 'a{background:url(data:image/svg+xml;base64,' + base64('gradient.svg') + ')}');
    }
  },
  'same file marked with ?embed twice': {
    topic: runOn('a{background:url(/test/data/gradient.jpg?embed)} div{background:url(/test/data/gradient.jpg?embed)}'),
    'should not embed to Base64': function(data) {
      assert.equal(data.embedded.plain,
        'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')} div{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}'
      );
    },
    'should yield a warning': function(data) {
      assert.deepEqual(data.warnings, ['File \'/test/data/gradient.jpg\' set for embedding more than once.']);
    }
  },
  'more than one file and only one marked with ?embed': {
    topic: runOn('a{background:url(/test/data/gradient.png)} div{background:url(/test/data/gradient.png?embed)} p{border-image:url(/test/data/gradient.png)}'),
    'should embed one file to Base64': function(data) {
      assert.equal(data.embedded.plain, [
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}',
        'div{background:url(data:image/png;base64,' + base64('gradient.png') + ')}',
        'p{border-image:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}'
      ].join(' '));
    }
  },
  'not embedded files': {
    topic: runOn('a{background:url(/test/data/gradient.png)} div{background:url(/test/data/gradient.jpg)}'),
    'should get mtime timestamp': function(data) {
      assert.equal(data.embedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')} div{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}');
    }
  },
  'not found files': {
    topic: runOn('a{background:url(/test/data/gradient2.png)}'),
    'should be left intact': function(data) {
      assert.equal(data.embedded.plain, data.original);
    },
    'should yield a warning': function(data) {
      assert.deepEqual(data.warnings, ['File \'/test/data/gradient2.png\' does not exist.']);
    }
  },
  'forced embedding': {
    'for same assets': {
      topic: runOn('a{background:url(/test/data/gradient.png)} div{background:url(/test/data/gradient.png)}', { forceEmbed: true }),
      'should embed all resources': function(data) {
        assert.equal(data.embedded.plain, [
          'a{background:url(data:image/png;base64,' + base64('gradient.png') + ')}',
          'div{background:url(data:image/png;base64,' + base64('gradient.png') + ')}',
        ].join(' '));
      }
    },
    'for different assets': {
      topic: runOn('a{background:url(/test/data/gradient.png)} div{background:url(/test/data/gradient.jpg)}', { forceEmbed: true }),
      'should embed all resources': function(data) {
        assert.equal(data.embedded.plain, [
          'a{background:url(data:image/png;base64,' + base64('gradient.png') + ')}',
          'div{background:url(data:image/jpeg;base64,' + base64('gradient.jpg') + ')}',
        ].join(' '));
      }
    }
  },
  'adding assets hosts': {
    topic: 'a{background:url(/test/data/gradient.png)} p{background:url(/test/data/gradient.jpg)} div{background:url(/test/data/gradient.gif)}',
    'single': function(css) {
      assert.equal(runOn(css, { assetHosts: 'assets.example.com' })().embedded.plain, [
        'a{background:url(//assets.example.com/test/data/gradient.png?' + mtime('gradient.png') + ')}',
        'p{background:url(//assets.example.com/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}',
        'div{background:url(//assets.example.com/test/data/gradient.gif?' + mtime('gradient.gif') + ')}'
      ].join(' '));
    },
    'multiple': function(css) {
      assert.equal(runOn(css, { assetHosts: 'assets[0,1,2].example.com' })().embedded.plain, [
        'a{background:url(//assets0.example.com/test/data/gradient.png?' + mtime('gradient.png') + ')}',
        'p{background:url(//assets1.example.com/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}',
        'div{background:url(//assets2.example.com/test/data/gradient.gif?' + mtime('gradient.gif') + ')}'
      ].join(' '));
    }
  }
})
.addBatch({
  'getting non-embedded version (IE7)': {
    topic: 'a{background:url(/test/data/gradient.png)} p{background:url(/test/data/gradient.jpg)}',
    'not by default': function(css) {
      assert.isUndefined(runOn(css)().notEmbedded);
    },
    'if requested': function(css) {
      assert.equal(runOn(css, { noEmbedVersion: true })().notEmbedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')} p{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}');
    }
  },
  'getting non-embedded version (IE7) with embed': {
    topic: 'a{background:url(/test/data/gradient.png?embed)}',
    'if requested': function(css) {
      assert.equal(runOn(css, { noEmbedVersion: true })().notEmbedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}');
    }
  },
  'getting non-embedded version (IE7) with duplicates and embed': {
    topic: 'a{background:url(/test/data/gradient.png?embed)} p{background:url(/test/data/gradient.png?embed)}',
    'if requested': function(css) {
      assert.equal(runOn(css, { noEmbedVersion: true })().notEmbedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')} p{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}');
    }
  }
}).addBatch({
  'should not add crypted stamp instead of timestamp': {
    'on CSS without images': {
      topic: runOn('a{background:#fff}', { cryptedStamp: true }),
      'should act as identity transformation': function(css) {
        assert.equal(css.embedded.plain, css.original);
      }
    },
    'on CSS with embedded images': {
      topic: runOn('a{background:url(/test/data/gradient.jpg?embed)}', { cryptedStamp: true }),
      'should not create new file': function() {
        var stamp = cryptedStamp('gradient.jpg');
        assert.equal(fs.existsSync(process.cwd() + '/test/data/gradient-' + stamp + '.jpg'), false);
      }
    }
  }
}).addBatch({
  'should add crypted stamp instead of timestamp on CSS with normal images': {
    topic: runOn('a{background:url(/test/data/gradient.png)}', { cryptedStamp: true }),
    'should create new file': function() {
      var stamp = cryptedStamp('gradient.png');
      assert.equal(fs.existsSync(process.cwd() + '/test/data/gradient-' + stamp + '.png'), true);
    },
    'should include stamped file in embed source': function(css) {
      var stamp = cryptedStamp('gradient.png');
      assert.equal('a{background:url(/test/data/gradient-' + stamp + '.png)}', css.embedded.plain);
    },
    teardown: function() {
      exec('rm -rf test/data/gradient-*');
    }
  }
}).addBatch({
  'should add crypted stamp instead of timestamp on non-embedded source': {
    topic: runOn('a{background:url(/test/data/gradient.png)}', {
      cryptedStamp: true,
      noEmbedVersion: true
    }),
    'once file exists': {
      topic: function(css) {
        var self = this;
        var stamp = cryptedStamp('gradient.png');

        fs.exists(process.cwd() + '/test/data/gradient-' + stamp + '.png', function() {
          self.callback(css, stamp);
        });
      },
      'should include stamped file in embed source': function(css, stamp) {
        assert.equal('a{background:url(/test/data/gradient-' + stamp + '.png)}', css.embedded.plain);
      },
      'should include stamped file in non-embedded source': function(css, stamp) {
        assert.equal('a{background:url(/test/data/gradient-' + stamp + '.png)}', css.notEmbedded.plain);
      }
    },
    teardown: function() {
      exec('rm -rf test/data/gradient-*');
    }
  }
}).addBatch({
  'should add crypted stamp instead of timestamp on non-embedded source for embedded image': {
    topic: runOn('a{background:url(/test/data/gradient.png?embed)}', {
      cryptedStamp: true,
      noEmbedVersion: true
    }),
    'once file exists': {
      topic: function(css) {
        var self = this;
        var stamp = cryptedStamp('gradient.png');

        fs.exists(process.cwd() + '/test/data/gradient-' + stamp + '.png', function() {
          self.callback(css, stamp);
        });
      },
      'should not include stamped file in embed source': function(css, stamp) {
        assert.notEqual('a{background:url(/test/data/gradient-' + stamp + '.png)}', css.embedded.plain);
      },
      'should include stamped file in non-embedded source': function(css, stamp) {
        assert.equal('a{background:url(/test/data/gradient-' + stamp + '.png)}', css.notEmbedded.plain);
      }
    },
    teardown: function() {
      exec('rm -rf test/data/gradient-*');
    }
  }
}).addBatch({
  'should correctly process files with dots': {
    topic: runOn('a{background:url(/test/data/gradient.special.png)}', { cryptedStamp: true }),
    'should create new file': function() {
      var stamp = cryptedStamp('gradient.png');
      assert.equal(fs.existsSync(process.cwd() + '/test/data/gradient.special-' + stamp + '.png'), true);
    },
    'should include stamped file in embed source': function(css) {
      var stamp = cryptedStamp('gradient.png');
      assert.equal('a{background:url(/test/data/gradient.special-' + stamp + '.png)}', css.embedded.plain);
    },
    teardown: function() {
      exec('rm -rf test/data/gradient.special-*');
    }
  }
}).addBatch({
  'should correctly process missing files with embed': {
    topic: runOn('a{background:url(/test/data/gradient2.png?embed)}', { cryptedStamp: true }),
    'should keep path as is': function(css) {
      assert.equal('a{background:url(/test/data/gradient2.png?embed)}', css.embedded.plain);
    }
  },
  'should correctly process missing files for crypted stamps': {
    topic: runOn('a{background:url(/test/data/gradient2.png)}', { cryptedStamp: true }),
    'should keep path as is': function(css) {
      assert.equal('a{background:url(/test/data/gradient2.png)}', css.embedded.plain);
    }
  }
}).addBatch({
  'compressed content': {
    topic: runOn('a{background:#fff}'),
    'not by default': function(data) {
      assert.isUndefined(data.embedded.compressed);
    }
  },
  'compressed embedded content': {
    topic: runOn('a{background:#fff}', { pregzip: true }),
    'should be buffer': function(data) {
      assert.ok(Buffer.isBuffer(data.embedded.compressed));
    },
    'should be different from uncompressed': function(data) {
      assert.notEqual(data.embedded.compressed.toString(), data.embedded.plain);
    },
    'should be different from original': function(data) {
      assert.notEqual(data.embedded.compressed.toString(), data.original);
    },
    'uncompressing': {
      topic: function(data) {
        zlib.unzip(data.embedded.compressed, this.callback);
      },
      'should be equal to embedded': function(error, uncompressed) {
        assert.equal('a{background:#fff}', uncompressed);
      }
    }
  },
  'compressed non-embedded content': {
    topic: runOn('a{background:#fff}', {
      pregzip: true,
      noEmbedVersion: true
    }),
    'should be buffer': function(data) {
      assert.ok(Buffer.isBuffer(data.notEmbedded.compressed));
    },
    'should be different from uncompressed': function(data) {
      assert.notEqual(data.notEmbedded.compressed.toString(), data.notEmbedded.plain);
    },
    'should be different from original': function(data) {
      assert.notEqual(data.notEmbedded.compressed.toString(), data.original);
    },
    'uncompressing': {
      topic: function(data) {
        zlib.unzip(data.notEmbedded.compressed, this.callback);
      },
      'should be equal to embedded': function(error, uncompressed) {
        assert.equal('a{background:#fff}', uncompressed);
      }
    }
  },
  'long content': {
    topic: runOn(fs.readFileSync('./test/data/large.css', 'utf-8'), { pregzip: true }),
    'uncompressing': {
      topic: function(data) {
        zlib.unzip(data.embedded.compressed, this.callback);
      },
      'should be equal to embedded': function(error, uncompressed) {
        assert.equal(fs.readFileSync('./test/data/large.css', 'utf-8'), uncompressed);
      }
    }
  }
}).addBatch({
  'list of missing files': {
    topic: runOn('a{background:url(/test/data/gradient2.png)} p{background:url(/test/data/gradient2.jpg)}')().missing,
    'should have both files': function(missing) {
      assert.equal(missing.length, 2);
    },
    'should have files in right order': function(missing) {
      assert.equal(missing[0], '/test/data/gradient2.png');
      assert.equal(missing[1], '/test/data/gradient2.jpg');
    }
  },
  'list of not embedded files (duplicates)': {
    topic: runOn('a{background:url(/test/data/gradient.png?embed)} p{background:url(/test/data/gradient.png?embed)}')().duplicates,
    'should have one file': function(duplicates) {
      assert.equal(duplicates.length, 1);
    },
    'should have gradient.png': function(duplicates) {
      assert.equal(duplicates[0], '/test/data/gradient.png');
    }
  }
}).addBatch({
  'parse absolute url': {
    topic: new EnhanceCSS({ rootPath: process.cwd() }).parseImageUrl('/test/data/gradient.png'),
    'should get right relative path': function(parsed) {
      assert.equal(parsed.relative, '/test/data/gradient.png');
    },
    'should get right absolute path': function(parsed) {
      assert.equal(parsed.absolute, path.join(process.cwd(), 'test', 'data', 'gradient.png'));
    },
    'should exists': function(parsed) {
      assert.isTrue(parsed.exists);
    },
    'should not have query options': function(parsed) {
      assert.isEmpty(parsed.query);
    }
  },
  'parse absolute url with query string': {
    topic: new EnhanceCSS({ rootPath: process.cwd() }).parseImageUrl('/test/data/gradient.png?embed&x=y'),
    'should get right relative path': function(parsed) {
      assert.equal(parsed.relative, '/test/data/gradient.png');
    },
    'should get right absolute path': function(parsed) {
      assert.equal(parsed.absolute, path.join(process.cwd(), 'test', 'data', 'gradient.png'));
    },
    'should exists': function(parsed) {
      assert.isTrue(parsed.exists);
    },
    'should have query options': function(parsed) {
      assert.isNotNull(parsed.query.embed);
      assert.equal('y', parsed.query.x);
    }
  },
  'parse non-canonical absolute urls': {
    topic: new EnhanceCSS({ rootPath: process.cwd() }).parseImageUrl('/test/data/../data/gradient.png'),
    'should get right relative path': function(parsed) {
      assert.equal(parsed.relative, '/test/data/gradient.png');
    },
    'should get right absolute path': function(parsed) {
      assert.equal(parsed.absolute, path.join(process.cwd(), 'test', 'data', 'gradient.png'));
    },
    'should exists': function(parsed) {
      assert.isTrue(parsed.exists);
    },
    'should not have query options': function(parsed) {
      assert.isEmpty(parsed.query);
    }
  },
  'parse absolute urls with special characters': {
    topic: new EnhanceCSS({ rootPath: process.cwd() }).parseImageUrl('"/test/data/gradient.png"'),
    'should get right relative path': function(parsed) {
      assert.equal(parsed.relative, '/test/data/gradient.png');
    },
    'should get right absolute path': function(parsed) {
      assert.equal(parsed.absolute, path.join(process.cwd(), 'test', 'data', 'gradient.png'));
    },
    'should exists': function(parsed) {
      assert.isTrue(parsed.exists);
    },
    'should not have query options': function(parsed) {
      assert.isEmpty(parsed.query);
    }
  },
  'parse relative url': {
    topic: new EnhanceCSS({ rootPath: process.cwd() }).parseImageUrl('test/data/gradient.png'),
    'should get right relative path': function(parsed) {
      assert.equal(parsed.relative, 'test/data/gradient.png');
    },
    'should get right absolute path': function(parsed) {
      assert.equal(parsed.absolute, path.join(process.cwd(), 'test', 'data', 'gradient.png'));
    },
    'should exists': function(parsed) {
      assert.isTrue(parsed.exists);
    }
  }
}).addBatch({
  'get empty asset host': {
    topic: new EnhanceCSS().nextAssetHost(),
    'from empty configuration': function(host) {
      assert.equal(host, null);
    }
  },
  'get single asset host fixed with': {
    topic: new EnhanceCSS({ assetHosts: 'assets.example.com' }).nextAssetHost(),
    'relative protocol': function(host) {
      assert.equal(host, '//assets.example.com');
    }
  },
  'get single asset host not fixed if': [
    {
      topic: new EnhanceCSS({ assetHosts: '//assets.example.com' }).nextAssetHost(),
      'relative protocol passed': function(host) {
        assert.equal(host, '//assets.example.com');
      }
    },
    {
      topic: new EnhanceCSS({ assetHosts: 'http://assets.example.com' }).nextAssetHost(),
      '"http" protocol passed': function(host) {
        assert.equal(host, 'http://assets.example.com');
      }
    },
    {
      topic: new EnhanceCSS({ assetHosts: 'https://assets.example.com' }).nextAssetHost(),
      '"https" protocol passed': function(host) {
        assert.equal(host, 'https://assets.example.com');
      }
    }
  ],
  'get multiple asset hosts fixed with': {
    topic: function() {
      return new EnhanceCSS({ assetHosts: 'assets[0,1].example.com' });
    },
    'relative protocol, for first in list': function(enhance) {
      assert.equal(enhance.nextAssetHost(), '//assets0.example.com');
    },
    'relative protocol, for second in list': function(enhance) {
      assert.equal(enhance.nextAssetHost(), '//assets1.example.com');
    }
  },
  'get multiple asset hosts not fixed if': [
    {
      topic: function() {
        return new EnhanceCSS({ assetHosts: '//assets[0,1].example.com' });
      },
      'relative protocol passed, for first in list': function(enhance) {
        assert.equal(enhance.nextAssetHost(), '//assets0.example.com');
      },
      'relative protocol passed, for second in list': function(enhance) {
        assert.equal(enhance.nextAssetHost(), '//assets1.example.com');
      }
    },
    {
      topic: function() {
        return new EnhanceCSS({ assetHosts: 'http://assets[0,1].example.com' });
      },
      '"http" protocol passed, for first in list': function(enhance) {
        assert.equal(enhance.nextAssetHost(), 'http://assets0.example.com');
      },
      '"http" protocol passed, for second in list': function(enhance) {
        assert.equal(enhance.nextAssetHost(), 'http://assets1.example.com');
      }
    },
    {
      topic: function() {
        return new EnhanceCSS({ assetHosts: 'https://assets[0,1].example.com' });
      },
      '"https" protocol passed, for first in list': function(enhance) {
        assert.equal(enhance.nextAssetHost(), 'https://assets0.example.com');
      },
      '"https" protocol passed, for second in list': function(enhance) {
        assert.equal(enhance.nextAssetHost(), 'https://assets1.example.com');
      }
    }
  ],
  'get one asset host': {
    topic: new EnhanceCSS({ assetHosts: '//assets.example.com' }).nextAssetHost(),
    'as first host from list': function(host) {
      assert.equal(host, '//assets.example.com');
    },
    'as second host from list': function(host) {
      assert.equal(host, '//assets.example.com');
    }
  },
  'get one asset host from multiple configuration - ': {
    topic: function() {
      return new EnhanceCSS({ assetHosts: '//assets[0,1,2].example.com' });
    },
    'first': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//assets0.example.com');
    },
    'second': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//assets1.example.com');
    },
    'third': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//assets2.example.com');
    },
    'fourth': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//assets0.example.com');
    }
  },
  'get one asset host from list of different subdomains': {
    topic: function() {
      return new EnhanceCSS({ assetHosts: '//[alpha,beta,gamma].example.com' });
    },
    'first': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//alpha.example.com');
    },
    'second': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//beta.example.com');
    },
    'third': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//gamma.example.com');
    },
    'fourth': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), '//alpha.example.com');
    }
  }
}).addBatch({
  'not embedded files should not get mtime timestamp if "stamp" option equals false': {
    topic: runOn('div{background:url(/test/data/gradient.jpg)}', {
      stamp: false,
      noEmbedVersion: true
    }),
    'in the "embedded" version': function(data) {
      assert.equal(data.embedded.plain, data.original);
    },
    'in the "not embedded" version': function(data) {
      assert.equal(data.notEmbedded.plain, data.original);
    }
  }
}).export(module);
