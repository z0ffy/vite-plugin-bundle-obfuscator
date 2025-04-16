export function isRegExp(input: any): input is RegExp {
  return Object.prototype.toString.call(input) === '[object RegExp]';
}

export function isString(input: any): input is string {
  return Object.prototype.toString.call(input) === '[object String]';
}

export function isObject(input: any): input is object {
  return Object.prototype.toString.call(input) === '[object Object]';
}

export function isArray(input: any): input is any[] {
  return Array.isArray(input);
}

export function isFunction(input: any): input is Function {
  const type = Object.prototype.toString.call(input);
  return type === '[object Function]' || type === '[object AsyncFunction]';
}

export function isBoolean(input: any): input is boolean {
  return Object.prototype.toString.call(input) === '[object Boolean]';
}

export function isFileNameExcluded(name: string, excludes: (RegExp | string)[]): boolean {
  for (const exclude of excludes) {
    if (isRegExp(exclude)) {
      if (exclude.test(name)) return true;
    } else if (isString(exclude)) {
      if (name.includes(exclude)) return true;
    }
  }
  return false;
}
