/* global self */
self.onmessage = () => {
  self.postMessage('VITE_WORKER_OBFUSCATOR_COMPATIBILITY_SENTINEL');
};
