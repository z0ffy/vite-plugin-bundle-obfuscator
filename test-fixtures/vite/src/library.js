export function add(a, b) {
  return a + b;
}

export function fail() {
  throw new Error('LIBRARY_SOURCEMAP_SENTINEL');
}

console.log('sum', add(1, 2));
