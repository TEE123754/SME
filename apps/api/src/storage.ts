import { resolve, relative, isAbsolute } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { PrivateDocumentStorage } from '@customerbuddy/contracts';
export function localStorage(root: string): PrivateDocumentStorage {
  function path(key: string) {
    if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.pdf$/.test(key))
      throw new Error('Invalid private storage key');
    const target = resolve(root, key),
      offset = relative(root, target);
    if (offset.startsWith('..') || isAbsolute(offset))
      throw new Error('Unsafe private storage target');
    return target;
  }
  return {
    async put(key, content) {
      const target = path(key);
      await mkdir(resolve(target, '..'), { recursive: true });
      const temp = target + '.' + randomUUID() + '.tmp';
      await writeFile(temp, content);
      await rename(temp, target);
    },
    async read(key) {
      return readFile(path(key));
    },
  };
}
