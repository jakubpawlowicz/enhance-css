0.6.0 / 2012-11-30
==================

 * Added 'stamp' option (default to true) which controls adding timestamps. (thanks to @borbit)
 * Added '--nostamp' option to binary.

0.5.2 / 2012-09-05
==================

 * Adding relative protocol to asset hosts if protocol part is not provided. (patch thanks to @borbit)

0.5.1 / 2012-08-14
==================

 * Fixed parsing relative URLs (kudos to @borbit for a patch!)

0.5.0 / 2012-08-05
==================

 * Added Windows support with tests.

0.4.1 / 2012-08-02
==================

 * Fixed vows dev dependency.
 * Added fs.existsSync fallback to get rid of 0.8 warnings.

0.4.0 / 2012-07-09
==================

  * Requires node 0.6+.
  * Replaced gzip with node's native zlib.
  * Fixed asynchronous mode for binaries (creating gzip data).
  * Added testing noembed & pregzip.

0.3.3 / 2012-07-04
==================

  * Fix for script failing for missing embedded files when using crypted stamps.

0.3.2 / 2012-07-03
==================

  * Leaves missing files as is.

0.3.1 / 2012-07-03
==================

  * Fixed assembling MD5 hash file name.

0.3.0 / 2012-07-03
==================

  * Aded node 0.4.x requirement.
  * Added cryptedStamp option for renaming image files with MD5 hash attached (hard cache boosters).

0.2.2 / 2011-09-25
==================

  * Fixed dependencies - missing 'gzip'. Thanks to fairwinds for reporting it.

0.2.1 / 2011-04-07
==================

  * Fixed bug in assembling compressed output (for large files only).

0.2.0 / 2011-04-03
==================

  * Added --pregzip option for automatic gzipping of enhanced files (not available when output is set to STDOUT).
  * Added binary file tests.

0.1.0 / 2011-03-20
==================

  * First version of enhance-css library.
  * Implemented JPG, PNG, GIF, and SVG images embedding (performed if ?embed param is present).
  * Implemented cache booster (via timestamp).
  * Implemented randomized asset hosts picker.