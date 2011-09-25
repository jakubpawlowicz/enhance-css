var vows = require('vows'),
  assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  exec = require('child_process').exec;
  
var checkFiles = function(fileName, options) {
  var pathToFile = function(noEmbed, pregzip) {
    return '/tmp/' + fileName + (noEmbed ? '-noembed' : '') + '.css' + (pregzip ? '.gz' : '');
  };
  
  assert.equal(path.existsSync(pathToFile()), true);
  assert.equal(path.existsSync(pathToFile(true)), !!options.noEmbed);
  assert.equal(path.existsSync(pathToFile(false, true)), !!options.pregzip);
  assert.equal(path.existsSync(pathToFile(true, true)), !!(options.pregzip && options.noEmbed));
};
  
vows.describe('enhance css binary').addBatch({
  'no options': {
    topic: function() {
      exec('./bin/enhancecss -h', this.callback);
    },
    'should give usage info': function(error, data) {
      assert.equal(0, data.indexOf('Usage:'));
    }
  },
  'simple embed': {
    topic: function() {
      exec("echo 'a{background:url(/test/data/gradient.png?embed);}' | ./bin/enhancecss -o /tmp/test1.css", this.callback);
    },
    'should give empty output': function(error, data) {
      assert.isEmpty(data);
    },
    'should create valid files': function() {
      checkFiles('test1', { noEmbed: false, pregzip: false });
    },
    teardown: function() {
      fs.unlink('/tmp/test1.css');
    }
  },
  'embed with --noembedversion option': {
    topic: function() {
      exec("echo 'a{background:url(/test/data/gradient.png?embed);}' | ./bin/enhancecss --noembedversion -o /tmp/test2.css", this.callback);
    },
    'should give empty output': function(error, data) {
      assert.isEmpty(data);
    },
    'should create valid files': function() {
      checkFiles('test2', { noEmbed: true, pregzip: false });
    },
    teardown: function() {
      fs.unlink('/tmp/test2.css');
      fs.unlink('/tmp/test2-noembed.css');
    }
  },
  'noembed & pregzipped version options': {
    topic: function() {
      exec("echo 'a{background:url(/test/data/gradient.png?embed);}' | ./bin/enhancecss --noembedversion --pregzip -o /tmp/test3.css", this.callback);
    },
    'should give empty output': function(error, data) {
      assert.isEmpty(data);
    },
    'should create valid files': function() {
      checkFiles('test3', { noEmbed: true, pregzip: true });
    },
    teardown: function() {
      fs.unlink('/tmp/test3.css');
      fs.unlink('/tmp/test3.css.gz');
      fs.unlink('/tmp/test3-noembed.css');
      fs.unlink('/tmp/test3-noembed.css.gz');
    }
  }
}).export(module);