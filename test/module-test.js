var vows = require('vows');
var assert = require('assert');
var EnhanceCSS = require('../lib/enhance.js');

vows.describe('module').addBatch({
  'imported as a function': {
    topic: function() {
      var instance = new EnhanceCSS();
      return instance.process.bind(instance);
    },
    'should not throw an error': function(process) {
      assert.doesNotThrow(function() {
        process('a{color:red}');
      });
    }
  },
  'initialization without new (back-compat)': {
    topic: function() {
      return EnhanceCSS();
    },
    'should be an EnhanceCSS instance': function(instance) {
      assert.isObject(instance);
      assert.equal(instance instanceof EnhanceCSS, true);
      assert.isFunction(instance.process);
    },
    'should process CSS correctly': function(instance) {
      assert.equal(instance.process('a{color:red}').embedded.plain, 'a{color:red}');
    }
  },
  'extended via prototype': {
    topic: function() {
      EnhanceCSS.prototype.foo = function(data, callback) {
        callback(null, this.process(data));
      };
      new EnhanceCSS().foo('a{color:red}', this.callback);
    },
    'should output correct CSS': function(error, processed) {
      assert.equal(processed.embedded.plain, 'a{color:red}');
    },
    teardown: function() {
      delete EnhanceCSS.prototype.foo;
    }
  },
  'initialization without options': {
    topic: function() {
      return new EnhanceCSS();
    },
    'should process CSS correctly': function(instance) {
      assert.equal(instance.process('a{color:red}').embedded.plain, 'a{color:red}');
    }
  }
}).export(module);
