import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { manifestFor, writeChecksums } from '../src/bundle.js';
import { buildAuthorityTransfer, buildShutdown } from '../src/manifest.js';
import type { Address } from '../src/types.js';

const authority = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address;

describe('bundle primitives', () => {
  it('decodes every action into an independently inspectable manifest', () => {
    expect(manifestFor(buildShutdown(authority, 123n).actions)).toHaveLength(35);
    expect(manifestFor(buildAuthorityTransfer(authority).actions)).toHaveLength(56);
  });

  it('writes stable sorted checksums excluding checksums.txt itself', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'gardens-bundle-'));
    await writeFile(path.join(directory, 'b.txt'), 'b');
    await writeFile(path.join(directory, 'a.txt'), 'a');
    await writeChecksums(directory);
    const first = await readFile(path.join(directory, 'checksums.txt'), 'utf8');
    await writeChecksums(directory);
    expect(await readFile(path.join(directory, 'checksums.txt'), 'utf8')).toBe(first);
    expect(first.split('\n')[0]).toContain('a.txt');
    expect(first).not.toContain('checksums.txt');
  });
});
