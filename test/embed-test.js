var vows = require('vows'),
  assert = require('assert'),
  fs = require('fs'),
  exec = require('child_process').exec,
  EnhanceCSS = require('../lib/enhance.js');

var runOn = function(css, extraOptions) {
  if (!extraOptions) extraOptions = {};

  return function() {
    return new EnhanceCSS(append({ rootPath: process.cwd() }, extraOptions)).process(css, this.callback);
  }
};

var append = function(o1, o2) {
  for (var k in o2) o1[k] = o2[k];
  return o1;
};

var base64 = function(imageName) {
  return fs.readFileSync(process.cwd() + '/test/data/' + imageName).toString('base64');
};

var mtime = function(imageName) {
  return Date.parse(fs.statSync(process.cwd() + '/test/data/' + imageName).mtime) / 1000;
};

vows.describe('embedding images').addBatch({
  'plain content': {
    topic: runOn('div{width:100px;height:50px}'),
    'should be left intact': function(data) {
      assert.equal(data.embedded.plain, data.original);
    }
  },
  'no embed': {
    topic: runOn('a{background:url(/test/data/gradient.jpg);}'),
    'for no ?embed parameter': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}');
    }
  },
  'urls with special characters #1': {
    topic: runOn("a{background:url(\"/test/data/gradient.jpg\");}"),
    'should be processed': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}')
    }
  },
  'urls with special characters #2': {
    topic: runOn("a{background:url('/test/data/gradient.jpg');}"),
    'should be processed': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}')
    }
  },
  'already embedded': {
    topic: runOn('a{background:url(data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0D/h7BrH/AEG7P/vmH/Gj/h7BrH/Qbs/++Yf8a/kX/tbVf+gnqH/gbc//AByj+1tV/wCgnqH/AIG3P/xyv9DFmeH0/wCEnL+n/LqP9z+75/gux/qgsJlWn/CRl/T/AJcR/wCnfkf/2Q==)}'),
    'should not be changed': function(data) {
      assert.equal(data.embedded.plain, data.original)
    }
  },
  'same urls with mixed characters': {
    topic: runOn("a{background:url('/test/data/gradient.jpg?embed');} div{background:url(/test/data/gradient.jpg?embed);}"),
    'should not be embedded': function(data) {
      assert.equal(data.embedded.plain,
        'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');} ' +
        'div{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ');}')
    }
  },
  'url with relative parts': {
    topic: runOn('a{background:url(/test/data/../data/gradient.png)}'),
    'should be normalized': function(data) {
      assert.equal(data.embedded.plain, 'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}');
    }
  },
  'external url': {
    topic: runOn('a{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAL0lEQVQYlWP8vPYPA27A8vPDT3zSH+9/xC/9CZ/0+3dv8Em/+4hf+tNrSqQpMRwASS8b5/ih3SAAAAAASUVORK5CYII=)}'),
    'should not be transformed': function(data) {
      assert.equal(data.embedded.plain, data.original);
    }
  },
  'one file to be embedded': {
    topic: function() {
      return function(type) { return 'a{background:url(/test/data/gradient.' + type + '?embed)}'; };
    },
    'should give Base64 embedded jpg': function(css) {
      assert.equal(runOn(css('jpg'))().embedded.plain, "a{background:url(data:image/jpeg;base64," + base64('gradient.jpg') + ")}")
    },
    'should give Base64 embedded png': function(css) {
      assert.equal(runOn(css('png'))().embedded.plain, "a{background:url(data:image/png;base64," + base64('gradient.png') + ")}")
    },
    'should give Base64 embedded gif': function(css) {
      assert.equal(runOn(css('gif'))().embedded.plain, "a{background:url(data:image/gif;base64," + base64('gradient.gif') + ")}")
    },
    'should give Base64 embedded svg': function(css) {
      assert.equal(runOn(css('svg'))().embedded.plain, "a{background:url(data:image/svg+xml;base64," + base64('gradient.svg') + ")}")
    }
  },
  'more than one file marked with ?embed': {
    topic: runOn('a{background:url(/test/data/gradient.jpg?embed)} div{background:url(/test/data/gradient.jpg?embed)}'),
    'should not embed to Base64': function(data) {
      assert.equal(data.embedded.plain,
        'a{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')} div{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}'
      )
    }
  },
  'more than one file and only one marked with ?embed': {
    topic: runOn('a{background:url(/test/data/gradient.png)} div{background:url(/test/data/gradient.png?embed)} p{border-image:url(/test/data/gradient.png)}'),
    'should embed one file to Base64': function(data) {
      assert.equal(data.embedded.plain,
        ['a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}',
         'div{background:url(data:image/png;base64,' + base64('gradient.png') + ')}',
         'p{border-image:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}'].join(' '))
    }
  },
  'not embedded files': {
    topic: runOn('a{background:url(/test/data/gradient.png)} div{background:url(/test/data/gradient.jpg)}'),
    'should get mtime timestamp': function(data) {
      assert.equal(data.embedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')} div{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}')
    }
  },
  'not found files': {
    topic: runOn('a{background:url(/test/data/gradient2.png)}'),
    'should be left intact': function(data) {
      assert.equal(data.embedded.plain, data.original);
    }
  },
  'adding assets hosts': {
    topic: 'a{background:url(/test/data/gradient.png)} p{background:url(/test/data/gradient.jpg)} div{background:url(/test/data/gradient.gif)}',
    'single': function(css) {
      assert.equal(runOn(css, { assetHosts: 'assets.example.com' })().embedded.plain,
        ['a{background:url(//assets.example.com/test/data/gradient.png?' + mtime('gradient.png') + ')}',
         'p{background:url(//assets.example.com/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}',
         'div{background:url(//assets.example.com/test/data/gradient.gif?' + mtime('gradient.gif') + ')}'].join(' ')
      )
    },
    'multiple': function(css) {
      assert.equal(runOn(css, { assetHosts: 'assets[0,1,2].example.com' })().embedded.plain,
        ['a{background:url(//assets0.example.com/test/data/gradient.png?' + mtime('gradient.png') + ')}',
         'p{background:url(//assets1.example.com/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}',
         'div{background:url(//assets2.example.com/test/data/gradient.gif?' + mtime('gradient.gif') + ')}'].join(' ')
      )
    }
  }
}).addBatch({
  'getting non-embedded version (IE7)': {
    topic: 'a{background:url(/test/data/gradient.png)} p{background:url(/test/data/gradient.jpg)}',
    'not by default': function(css) {
      assert.isUndefined(runOn(css)().notEmbedded)
    },
    'if requested': function(css) {
      assert.equal(runOn(css, { noEmbedVersion: true })().notEmbedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')} p{background:url(/test/data/gradient.jpg?' + mtime('gradient.jpg') + ')}')
    }
  },
  'getting non-embedded version (IE7) with embed': {
    topic: 'a{background:url(/test/data/gradient.png?embed)}',
    'if requested': function(css) {
      assert.equal(runOn(css, { noEmbedVersion: true })().notEmbedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}')
    }
  },
  'getting non-embedded version (IE7) with duplicates and embed': {
    topic: 'a{background:url(/test/data/gradient.png?embed)} p{background:url(/test/data/gradient.png?embed)}',
    'if requested': function(css) {
      assert.equal(runOn(css, { noEmbedVersion: true })().notEmbedded.plain,
        'a{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')} p{background:url(/test/data/gradient.png?' + mtime('gradient.png') + ')}')
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
        fs.writeFileSync('/tmp/data1.gz', data.embedded.compressed);
        exec("gzip -c -d /tmp/data1.gz", this.callback);
      },
      'should be equal to embedded': function(error, uncompressed) {
        assert.equal('a{background:#fff}', uncompressed);
      },
      teardown: function() {
        fs.unlinkSync('/tmp/data1.gz');
      }
    }
  },
  'compressed non-embedded content': {
    topic: runOn('a{background:#fff}', { pregzip: true, noEmbedVersion: true}),
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
        fs.writeFileSync('/tmp/data2.gz', data.notEmbedded.compressed);
        exec("gzip -c -d /tmp/data2.gz", this.callback);
      },
      'should be equal to embedded': function(error, uncompressed) {
        assert.equal('a{background:#fff}', uncompressed);
      },
      teardown: function() {
        fs.unlinkSync('/tmp/data2.gz');
      }
    }
  },
  'long content': {
    topic: runOn(fs.readFileSync('./test/data/large.css', 'utf-8'), { pregzip: true }),
    'uncompressing': {
      topic: function(data) {
        fs.writeFileSync('/tmp/data3.gz', data.embedded.compressed);
        exec("gzip -c -d /tmp/data3.gz", this.callback);
      },
      'should be equal to embedded': function(error, uncompressed) {
        assert.equal(fs.readFileSync('./test/data/large.css', 'utf-8'), uncompressed);
      },
      teardown: function() {
        fs.unlinkSync('/tmp/data3.gz');
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
      assert.equal(parsed.absolute, process.cwd() + '/test/data/gradient.png');
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
      assert.equal(parsed.absolute, process.cwd() + '/test/data/gradient.png');
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
      assert.equal(parsed.absolute, process.cwd() + '/test/data/gradient.png');
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
      assert.equal(parsed.absolute, process.cwd() + '/test/data/gradient.png');
    },
    'should exists': function(parsed) {
      assert.isTrue(parsed.exists);
    },
    'should not have query options': function(parsed) {
      assert.isEmpty(parsed.query);
    }
  }
}).addBatch({
  'get empty asset host': {
    topic: new EnhanceCSS({}).nextAssetHost(),
    'from empty configuration': function(host) { assert.equal(host, null); }
  },
  'get one asset host': {
    topic: new EnhanceCSS({ assetHosts: 'assets.example.com' }).nextAssetHost(),
    'as first host from list': function(host) {
      assert.equal(host, 'assets.example.com');
    },
    'as second host from list': function(host) {
      assert.equal(host, 'assets.example.com');
    }
  },
  'get one asset host from multiple configuration - ': {
    topic: function() {
      return new EnhanceCSS({ assetHosts: 'assets[0,1,2].example.com' });
    },
    'first': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'assets0.example.com');
    },
    'second': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'assets1.example.com');
    },
    'third': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'assets2.example.com');
    },
    'fourth': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'assets0.example.com');
    }
  },
  'get one asset host from list of different subdomains': {
    topic: function() {
      return new EnhanceCSS({ assetHosts: '[alpha,beta,gamma].example.com' });
    },
    'first': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'alpha.example.com');
    },
    'second': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'beta.example.com');
    },
    'third': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'gamma.example.com');
    },
    'fourth': function(enhanceCSS) {
      assert.equal(enhanceCSS.nextAssetHost(), 'alpha.example.com');
    }
  }
}).export(module);