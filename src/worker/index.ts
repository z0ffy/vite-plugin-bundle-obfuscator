import { parentPort } from 'node:worker_threads';
import javascriptObfuscator from 'javascript-obfuscator';
import { Log, ObfuscatedFilesRegistry } from '../utils';
import type { ObfuscationResult, WorkerMessage } from '../type';

if (parentPort) {
  parentPort.on('message', (message: WorkerMessage) => {
    const results: ObfuscationResult[] = [];
    const _log = new Log(message.config.log);
    const registry = ObfuscatedFilesRegistry.getInstance();

    if (message.registryState && Array.isArray(message.registryState)) {
      registry.updateFromSerialized(message.registryState);
    }

    for (const [fileName, bundleItem] of message.chunk) {
      if (registry.isObfuscated(fileName)) {
        _log.info(`skipping ${fileName} (already in obfuscated registry)`);
        results.push({
          fileName,
          obfuscatedCode: bundleItem.code,
        });
        continue;
      }

      _log.info(`worker obfuscating ${fileName}...`);
      const obfuscated = javascriptObfuscator.obfuscate(bundleItem.code, message.config.options);
      _log.info(`worker obfuscation complete for ${fileName}.`);

      registry.markAsObfuscated(fileName);
      _log.info(`worker added ${fileName} to obfuscated files registry`);

      results.push({
        fileName,
        obfuscatedCode: obfuscated.getObfuscatedCode(),
      });
    }

    if (parentPort) {
      parentPort.postMessage({
        results,
        registryState: registry.serialize(),
      });
    }
  });
}
