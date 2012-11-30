var vows = require('vows'),
  assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  exec = require('child_process').exec,
  zlib = require('zlib'),
  existsSync = fs.existsSync || path.existsSync;

var isWindows = process.platform == 'win32';

var source = "a{background:url(/test/data/gradient.png?embed);}";

var checkFiles = function(fileName, options) {
  var pathToFile = function(noEmbed, pregzip) {
    return '/tmp/' + fileName + (noEmbed ? '-noembed' : '') + '.css' + (pregzip ? '.gz' : '');
  };

  assert.equal(existsSync(pathToFile()), true);
  assert.equal(existsSync(pathToFile(true)), !!options.noEmbed);
  assert.equal(existsSync(pathToFile(false, true)), !!options.pregzip);
  assert.equal(existsSync(pathToFile(true, true)), !!(options.pregzip && options.noEmbed));

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
  fs.unlink('/tmp/test' + no + '.css');
  fs.unlink('/tmp/test' + no + '-noembed.css');
  fs.unlink('/tmp/test' + no + '.css.gz');
  fs.unlink('/tmp/test' + no + '-noembed.css.gz');

  if (callback) callback();
};

var binaryContext = function(options, context) {
  context.topic = function() {
    if (isWindows)
      exec("set __DIRECT__=1 & node .\\bin\\enhancecss " + options, this.callback);
    else
      exec("__DIRECT__=1 ./bin/enhancecss " + options, this.callback);
  };
  return context;
};

var pipelinedContext = function(options, context) {
  if (isWindows)
    return {};

  context.topic = function() {
    exec("echo '" + source + "' | ./bin/enhancecss " + options, this.callback);
  };
  return context;
};

vows.describe('enhance css binary').addBatch({
  'no option': binaryContext("", {
    'should give usage info': function(error, stdout) {
      assert.equal(0, stdout.indexOf('usage:'));
    }
  }),
  'help option': binaryContext("-h", {
    'should give usage info': function(error, stdout) {
      assert.equal(0, stdout.indexOf('usage:'));
    }
  }),
  'version option': binaryContext("-v", {
    'should give usage info': function(error, stdout) {
      var version = JSON.parse(fs.readFileSync('./package.json')).version;
      assert.equal(stdout, version + "\n");
    }
  }),
  'simple embed': pipelinedContext("-o /tmp/test1.css", {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test1', { noEmbed: false, pregzip: false });
    },
    teardown: cleanup(1)
  }),
  'simple embed with no stamps': pipelinedContext("--noembedversion --nostamp -o /tmp/test1.css", {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test1', { stamp: false, noEmbed: true, pregzip: false });
    },
    teardown: cleanup(1)
  }),
  'embed with --noembedversion option': pipelinedContext("--noembedversion -o /tmp/test2.css", {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test2', { noEmbed: true, pregzip: false });
    },
    teardown: cleanup(2)
  }),
  'embed with noembed and gzip': pipelinedContext("--noembedversion --pregzip -o /tmp/test3.css", {
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test3', { noEmbed: true, pregzip: true });
    },
    teardown: cleanup(3)
  }),
  'noembed and crypted stamp options': pipelinedContext('--cryptedstamp --noembedversion -o /tmp/test4.css', {
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

      assert.equal(existsSync(process.cwd() + '/test/data/gradient-' + cryptedStamp + '.png'), true);
    },
    teardown: cleanup(4, function() {
      exec('rm -rf ' + process.cwd() + '/test/data/gradient-*.png');
    })
  })
}).export(module);