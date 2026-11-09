export async function load() {
  const { double } = await import('./browser-lazy.js');
  return double(21);
}
