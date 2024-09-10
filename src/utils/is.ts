export function isRegExp(input: any): input is RegExp {
  return Object.prototype.toString.call(input) === '[object RegExp]';
}

export function isString(input: any): input is string {
  return Object.prototype.toString.call(input) === '[object String]';
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
