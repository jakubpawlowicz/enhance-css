var vows = require('vows'),
  assert = require('assert'),
  fs = require('fs'),
  enhance = require('../lib/enhance.js').enhance;
  
var runOn = function(css) {
  return enhance.process(css, { rootPath: process.cwd() });
};

var base64 = function(imageName) {
  return fs.readFileSync(process.cwd() + '/test/data/' + imageName).toString('base64');
};

vows.describe('embedding images').addBatch({
  'no embed': {
    topic: 'a{background:url(/test/data/gradient.jpg);}',
    'for no ?embed parameter': function(css) {
      assert.equal(runOn(css), css);
    }
  },
  'one jpeg': {
    topic: 'a{background:url(/test/data/gradient.jpg?embed)}',
    'should give Base64 embedded content': function(css) {
      assert.equal(runOn(css), "a{background:url(data:image/jpeg;base64," + base64('gradient.jpg') + ")}")
    }
  },
  'one png': {
    topic: 'a{background:url(/test/data/gradient.png?embed)}',
    'should give Base64 embedded content': function(css) {
      assert.equal(runOn(css), "a{background:url(data:image/png;base64," + base64('gradient.png') + ")}")
    }
  }
}).export(module);