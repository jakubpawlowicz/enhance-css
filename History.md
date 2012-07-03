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