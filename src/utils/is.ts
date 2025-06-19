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

export function isFileNameExcluded(fileName: string, excludes: (RegExp | string)[] | RegExp | string): boolean {
  if (!excludes) return false;

  if (Array.isArray(excludes)) {
    return excludes.some((exclude) => {
      if (isString(exclude)) {
        return fileName.includes(exclude);
      } else if (isRegExp(exclude)) {
        return exclude.test(fileName);
      }
      return false;
    });
  } else if (isString(excludes)) {
    return fileName.includes(excludes);
  } else if (isRegExp(excludes)) {
    return excludes.test(fileName);
  }

  return false;
}
