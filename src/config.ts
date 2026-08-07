import { readFile } from 'node:fs/promises';
import { isAddress } from 'viem';
import { z } from 'zod';
import type { Address, ProposalConfig } from './types.js';

const address = z.string().refine(isAddress, 'Expected a valid EVM address.').transform((value) => value as Address);

const configSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.enum(['design', 'production']),
  chainId: z.literal(100),
  snapshotBlock: z.union([z.literal('latest'), z.string().regex(/^\d+$/)]),
  replacementAuthority: address,
  expectedSafeOwners: z.array(address),
  expectedSafeThreshold: z.number().int().nonnegative()
}).superRefine((config, context) => {
  if (config.kind !== 'production') return;
  if (config.snapshotBlock === 'latest') context.addIssue({ code: 'custom', path: ['snapshotBlock'], message: 'Production bundles require an exact block number.' });
  if (config.expectedSafeOwners.length === 0) context.addIssue({ code: 'custom', path: ['expectedSafeOwners'], message: 'Production bundles require the expected Safe owner set.' });
  if (config.expectedSafeThreshold < 1 || config.expectedSafeThreshold > config.expectedSafeOwners.length) {
    context.addIssue({ code: 'custom', path: ['expectedSafeThreshold'], message: 'Safe threshold must be between 1 and the number of expected owners.' });
  }
  const uniqueOwners = new Set(config.expectedSafeOwners.map((owner) => owner.toLowerCase()));
  if (uniqueOwners.size !== config.expectedSafeOwners.length) context.addIssue({ code: 'custom', path: ['expectedSafeOwners'], message: 'Safe owners must be unique.' });
});

export async function loadConfig(path: string): Promise<ProposalConfig> {
  const parsed = configSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  return parsed as ProposalConfig;
}
