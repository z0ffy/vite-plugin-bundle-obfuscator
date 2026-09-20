/* global document, Worker */
const app = document.querySelector('#app');
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

worker.postMessage('compatibility');

if (app) {
  app.textContent = 'VITE_OBFUSCATOR_COMPATIBILITY_SENTINEL';
}
