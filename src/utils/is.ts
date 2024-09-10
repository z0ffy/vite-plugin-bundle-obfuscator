function isRegExp(input: any): input is RegExp {
  return Object.prototype.toString.call(input) === '[object RegExp]';
}
