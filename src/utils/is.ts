export function isRegExp(input: any): input is RegExp {
  return Object.prototype.toString.call(input) === '[object RegExp]';
}

export function isString(input: any): input is string {
  return Object.prototype.toString.call(input) === '[object String]';
}
