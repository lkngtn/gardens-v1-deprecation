import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const authority = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function configFile(config: unknown): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'gardens-config-'));
  const file = path.join(directory, 'config.json');
  await writeFile(file, JSON.stringify(config));
  return file;
}

describe('proposal config', () => {
  it('accepts the fork-only design authority', async () => {
    const file = await configFile({ schemaVersion: 1, kind: 'design', chainId: 100, snapshotBlock: 'latest', replacementAuthority: authority, expectedSafeOwners: [], expectedSafeThreshold: 0 });
    await expect(loadConfig(file)).resolves.toMatchObject({ kind: 'design', replacementAuthority: authority });
  });

  it('requires exact production blocks and valid Safe expectations', async () => {
    const file = await configFile({ schemaVersion: 1, kind: 'production', chainId: 100, snapshotBlock: 'latest', replacementAuthority: authority, expectedSafeOwners: [], expectedSafeThreshold: 0 });
    await expect(loadConfig(file)).rejects.toThrow('Production bundles require an exact block number');
  });
});
