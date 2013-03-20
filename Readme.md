[![NPM version](https://badge.fury.io/js/enhance-css.png)](http://badge.fury.io/js/enhance-css)
[![Build Status](https://secure.travis-ci.org/GoalSmashers/enhance-css.png)](http://travis-ci.org/GoalSmashers/enhance-css)
[![Dependency Status](https://gemnasium.com/GoalSmashers/enhance-css.png)](https://gemnasium.com/GoalSmashers/enhance-css)

## What is enhance-css?

Enhance-css is a [node.js](http://nodejs.org/) library for enhancing CSS with:

* external file stamps to boost caching (either timestamps or MD5 hashes)
* image embedding to [Base64](http://en.wikipedia.org/wiki/Base64)
  (to reduce the number of requests)
* spawning assets into multiple asset hosts (to parallelize requests)

There is also an option to create non-embedded version suited well
for older browsers (IE 7 and below).

## Usage

### What are the requirements?

```
node.js 0.6.0+ on UN*X (fully tested on OS X 10.6+ and CentOS)
node.js 0.8.0+ on Windows
```

### How to install enhance-css?

```
npm install enhance-css
```

### How to use enhance-css?

Most likely you are going to pass multiple CSS files into it
and specify root directory and output file, e.g.

```bash
cat path/to/first.css path/to/second.css path/to/third.css | enhancecss -o bundled.css --root ./public/
```

The `--root` parameter is required to properly locate images referenced in css files.

To **embed images** in Base64 just add the *embed* argument to the image url, e.g.

```css
a { background: url(/images/arrow.png?embed) 0 0 no-repeat; }
```

### No embed version

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

which will result in all not-embedded image URLs bound to either assets0.example.com or assets1.example.com.

## License

Enhance-css is released under the [MIT License](/LICENSE).
