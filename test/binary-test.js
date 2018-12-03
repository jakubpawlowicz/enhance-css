var vows = require('vows');
var assert = require('assert');
var fs = require('fs');
var exec = require('child_process').exec;
var zlib = require('zlib');

var isWindows = process.platform == 'win32';

var source = 'a{background:url(/test/data/gradient.png?embed)}';

var checkFiles = function(fileName, options) {
  var pathToFile = function(noEmbed, pregzip) {
    return '/tmp/' + fileName + (noEmbed ? '-noembed' : '') + '.css' + (pregzip ? '.gz' : '');
  };

  assert.equal(fs.existsSync(pathToFile()), true);
  assert.equal(fs.existsSync(pathToFile(true)), !!options.noEmbed);
  assert.equal(fs.existsSync(pathToFile(false, true)), !!options.pregzip);
  assert.equal(fs.existsSync(pathToFile(true, true)), !!(options.pregzip && options.noEmbed));

  // verify content
  assert.include(fs.readFileSync(pathToFile()).toString('utf8'), 'a{background:url(data:image/png;base64');
  if (options.noEmbed) {
    assert.include(fs.readFileSync(pathToFile(true)).toString('utf8'), 'a{background:url(/test/data/gradient');

    if (options.stamp === false) {
      assert.match(fs.readFileSync(pathToFile(true)).toString('utf8'), /gradient\.\w+\)/);
    }
  }

  if (options.pregzip) {
    zlib.gunzip(fs.readFileSync(pathToFile(false, true)), function(error, result) {
      assert.include(result.toString('utf8'), 'a{background:url(data:image/png;base64');
    });

    if (options.noEmbed) {
      zlib.gunzip(fs.readFileSync(pathToFile(true, true)), function(error, result) {
        assert.include(result.toString('utf8'), 'a{background:url(/test/data/gradient');
      });
    }
  }
};

var cleanup = function(no, callback) {
  var swallowErrors = function() {};

  fs.unlink('/tmp/test' + no + '.css', swallowErrors);
  fs.unlink('/tmp/test' + no + '-noembed.css', swallowErrors);
  fs.unlink('/tmp/test' + no + '.css.gz', swallowErrors);
  fs.unlink('/tmp/test' + no + '-noembed.css.gz', swallowErrors);

  if (callback)
    callback();
};

var binaryContext = function(options, context) {
  if (isWindows)
    return {};

  context.topic = function() {
    exec('__DIRECT__=1 ./bin/enhancecss ' + options, this.callback);
  };
  return context;
};

var pipelinedContext = function(options, context) {
  if (isWindows)
    return {};

  var cssSource = source;
  if ('source' in context) {
    cssSource = context.source;
    delete context.source;
  }

  context.topic = function() {
    exec('echo "' + cssSource + '" | ./bin/enhancecss ' + options, this.callback);
  };
  return context;
};

vows.describe('enhance css binary').addBatch({
  'no option': binaryContext('', {
    'should give usage info': function(error, stdout) {
      assert.notEqual(-1, stdout.indexOf('Usage:'));
    }
  }),
  'help option': binaryContext('-h', {
    'should give usage info': function(error, stdout) {
      assert.notEqual(-1, stdout.indexOf('Usage:'));
    }
  }),
  'version option': binaryContext('-v', {
    'should give usage info': function(error, stdout) {
      var version = JSON.parse(fs.readFileSync('./package.json')).version;
      assert.equal(stdout, version + '\n');
    }
  }),
  'simple embed': pipelinedContext('-o /tmp/test.css', {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test', {
        noEmbed: false,
        pregzip: false
      });
    },
    teardown: cleanup(1)
  }),
  'simple embed with no stamps': pipelinedContext('--no-embed-version --no-stamp -o /tmp/test1.css', {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test1', {
        stamp: false,
        noEmbed: true,
        pregzip: false
      });
    },
    teardown: cleanup(1)
  }),
  'embed with --no-embed-version option': pipelinedContext('--no-embed-version -o /tmp/test2.css', {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test2', {
        noEmbed: true,
        pregzip: false
      });
    },
    teardown: cleanup(2)
  }),
  'embed with noembed and gzip': pipelinedContext('--no-embed-version --pregzip -o /tmp/test3.css', {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test3', {
        noEmbed: true,
        pregzip: true
      });
    },
    teardown: cleanup(3)
  }),
  'noembed and crypted stamp options': pipelinedContext('--crypted-stamp --no-embed-version -o /tmp/test4.css', {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test4', { noEmbed: true });
    },
    'should create crypted file': function() {
      var data = fs.readFileSync(process.cwd() + '/test/data/gradient.png');
      var stamp = require('crypto').createHash('md5');
      stamp.update(data.toString('utf8'));
      var cryptedStamp = stamp.digest('hex');

      assert.equal(fs.existsSync(process.cwd() + '/test/data/gradient-' + cryptedStamp + '.png'), true);
    },
    teardown: cleanup(4, function() {
      exec('rm -rf ' + process.cwd() + '/test/data/gradient-*.png');
    })
  }),
  'forced embed': pipelinedContext('--force-embed -o /tmp/test5.css', {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test5', { noEmbed: false });
    }
  }),
  'warnings': pipelinedContext('-o /tmp/test6', {
    'source': 'a{background:url(/test/data/gradient.webp?embed)}',
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should output warnings in stderr': function(error, stdout, stderr) {
      assert.equal(stderr, 'WARNING: File \'/test/data/gradient.webp\' skipped because of unknown content type.\n');
    },
    teardown: cleanup(6)
  })
}).export(module);
