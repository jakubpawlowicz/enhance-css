var buf = new Buffer("abc123");
console.log(buf.toString());
console.log(buf.toString('base64'));

require('fs').readFile('gradient.png', function(error, text) {
  if (error) throw error;
  console.log(text.toString('base64'));
  // console.log(new Buffer(text));
});