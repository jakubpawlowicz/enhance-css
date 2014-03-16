[![NPM version](https://badge.fury.io/js/enhance-css.png)](https://badge.fury.io/js/enhance-css)
[![Build Status](https://secure.travis-ci.org/GoalSmashers/enhance-css.png)](https://travis-ci.org/GoalSmashers/enhance-css)
[![Dependency Status](https://david-dm.org/GoalSmashers/enhance-css.png?theme=shields.io)](https://david-dm.org/GoalSmashers/enhance-css)
[![devDependency Status](https://david-dm.org/GoalSmashers/enhance-css/dev-status.png?theme=shields.io)](https://david-dm.org/GoalSmashers/enhance-css#info=devDependencies)

## What is enhance-css?

Enhance-css is a [node.js](http://nodejs.org/) tool which can tweak your CSS files to:

* improve caching - by rewriting URLs and renaming files to include either timestamps or MD5 hashes;
* parellelize requests - by rewriting URLs with one or more asset hosts;
* reduce number of requests - by embedding images as [Base64](http://en.wikipedia.org/wiki/Base64) data.

There is also an option to create non-embedded version suited well
for older browsers (IE 7 and below).


## Usage

### What are the requirements?

```
node.js 0.8.0+ (fully tested on OS X 10.6+, CentOS, and Windows 7)
```

### How to install enhance-css?

```
npm install enhance-css
```

### How to use enhance-css CLI?

```
enhancecss [options] [source-file]

-h, --help                    output usage information
-v, --version                 output the version number
-r, --root [root-path]        Set a root path to which resolve absolute @import rules
-o, --output [output-file]    Use [output-file] as output instead of STDOUT
--crypted-stamp               Rename image files with MD5 hash attached (hard cache boosters)
--no-stamp                    Disable adding stamp to URLs
--no-embed-version            Output both embedded and non embedded version
--force-embed                 Forces embed on all supported assets
--asset-hosts [host-pattern]  Use one or more asset hosts, e.g assets[0,1,2].example.com
--pregzip                     Automatically gzip the enhanced files (not available when no output file given)
```

#### Examples:

Most likely you are going to pass multiple CSS files into it
and specify root directory and output file, e.g.

```bash
cat path/to/first.css path/to/second.css path/to/third.css | enhancecss -o bundled.css --root ./public/
```

The `--root` parameter is required to properly locate images referenced in the css files.

To **embed images** in Base64 just add the *embed* argument to the image url, e.g.

```css
a { background: url(/images/arrow.png?embed) 0 0 no-repeat; }
```

### Non-embedded version

In case you also need to support older browser, just add `--noembedversion` parameter, e.g.

```bash
cat path/to/first.css path/to/second.css path/to/third.css | enhancecss -o bundled.css --root ./public/ --noembedversion
```

which will result in two output files: *bundled.css* and *bundled-noembed.css*.

### Asset hosts

To use one or more asset hosts, just specify `--assetshosts` parameter, e.g.

```bash
cat path/to/first.css path/to/second.css path/to/third.css | enhancecss -o bundled.css --root ./public/ --assethosts assets[0,1].example.com
```

which will result in all non-embedded image URLs bound to either assets0.example.com or assets1.example.com.

### What are the enhance-css' dev commands?

First clone the source, then run:

* `npm run check` to check JS sources with [JSHint](https://github.com/jshint/jshint/)
* `npm test` for the test suite


## License

Enhance-css is released under the [MIT License](/LICENSE).
