import { parentPort } from 'node:worker_threads';
import { ObfuscationResult, WorkerMessage } from '../type';
import { obfuscateBundle } from '../utils';

parentPort?.on('message', (message: WorkerMessage) => {
  const { config, chunk } = message;

  const result: ObfuscationResult[] = chunk.map(([fileName, bundleItem]) => {
    const obfuscatedCode = obfuscateBundle(config, fileName, bundleItem);

    return { fileName, obfuscatedCode };
  });

  parentPort?.postMessage(result);
});
