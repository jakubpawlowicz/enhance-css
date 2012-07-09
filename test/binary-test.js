var vows = require('vows'),
  assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  exec = require('child_process').exec,
  zlib = require('zlib');

var source = "a{background:url(/test/data/gradient.png?embed);}";

var checkFiles = function(fileName, options) {
  var pathToFile = function(noEmbed, pregzip) {
    return '/tmp/' + fileName + (noEmbed ? '-noembed' : '') + '.css' + (pregzip ? '.gz' : '');
  };

  assert.equal(path.existsSync(pathToFile()), true);
  assert.equal(path.existsSync(pathToFile(true)), !!options.noEmbed);
  assert.equal(path.existsSync(pathToFile(false, true)), !!options.pregzip);
  assert.equal(path.existsSync(pathToFile(true, true)), !!(options.pregzip && options.noEmbed));

  // verify content
  assert.include(fs.readFileSync(pathToFile()).toString('utf8'), 'a{background:url(data:image/png;base64');
  if (options.noEmbed)
    assert.include(fs.readFileSync(pathToFile(true)).toString('utf8'), 'a{background:url(/test/data/gradient');

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

vows.describe('enhance css binary').addBatch({
  'no option': {
    topic: function() {
      exec('__DIRECT__=1 ./bin/enhancecss', this.callback);
    },
    'should give usage info': function(error, stdout) {
      assert.equal(0, stdout.indexOf('usage:'));
    }
  },
  'help option': {
    topic: function() {
      exec('./bin/enhancecss -h', this.callback);
    },
    'should give usage info': function(error, stdout) {
      assert.equal(0, stdout.indexOf('usage:'));
    }
  },
  'version option': {
    topic: function() {
      exec('./bin/enhancecss -v', this.callback);
    },
    'should give usage info': function(error, stdout) {
      var version = JSON.parse(fs.readFileSync('./package.json')).version;
      assert.equal(stdout, version + "\n");
    }
  },
  'simple embed': {
    topic: function() {
      exec("echo '" + source + "' | ./bin/enhancecss -o /tmp/test1.css", this.callback);
    },
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test1', { noEmbed: false, pregzip: false });
    },
    teardown: cleanup(1)
  },
  'embed with --noembedversion option': {
    topic: function() {
      exec("echo '" + source + "' | ./bin/enhancecss --noembedversion -o /tmp/test2.css", this.callback);
    },
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test2', { noEmbed: true, pregzip: false });
    },
    teardown: cleanup(2)
  },
  'embed with noembed and gzip': {
    topic: function() {
      exec("echo '" + source + "' | ./bin/enhancecss --noembedversion --pregzip -o /tmp/test3.css", this.callback);
    },
    'should give empty output': function(error, stdout) {
      assert.isEmpty(stdout);
    },
    'should create valid files': function() {
      checkFiles('test3', { noEmbed: true, pregzip: true });
    },
    teardown: cleanup(3)
  },
  'noembed and crypted stamp options': {
    topic: function() {
      exec("echo '" + source + "' | ./bin/enhancecss --cryptedstamp --noembedversion -o /tmp/test4.css", this.callback);
    },
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

      assert.equal(path.existsSync(process.cwd() + '/test/data/gradient-' + cryptedStamp + '.png'), true);
    },
    teardown: cleanup(4, function() {
      exec('rm -rf ' + process.cwd() + '/test/data/gradient-*.png');
    })
  }
}).export(module);