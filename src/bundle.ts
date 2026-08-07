import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeFunctionData, encodeFunctionData, keccak256, stringToHex } from 'viem';
import { ACL_ABI, AGENT_ABI, CONVICTION_ABI, DECISION_ABI } from './abis.js';
import { ADDRESSES } from './addresses.js';
import { buildAuthorityTransfer, buildShutdown, decodeCallScript, type RawAction } from './manifest.js';
import { readSnapshot } from './state.js';
import type { BundleMetadata, CallScriptAction, Hex, ProposalConfig, UnsignedVotePreview } from './types.js';

export const REPOSITORY_URL = 'https://github.com/lkngtn/gardens-v1-deprecation';

function json(value: unknown): string {
  return `${JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item, 2)}\n`;
}

function sourceCommit(): string {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Could not resolve a full source commit.');
  return commit;
}

function decodeArgs(functionName: string, args: readonly unknown[] | undefined): Record<string, string | boolean> {
  const values = args ?? [];
  const names = functionName === 'pauseContract' ? ['pauseEnabled']
    : functionName === 'transfer' ? ['token', 'to', 'value']
      : functionName === 'setPermissionManager' ? ['newManager', 'app', 'role']
        : ['entity', 'app', 'role'];
  return Object.fromEntries(values.map((value, index) => [names[index] ?? `arg${index}`, typeof value === 'boolean' ? value : String(value)]));
}

export function manifestFor(actions: readonly RawAction[]): CallScriptAction[] {
  return actions.map((action, index) => {
    const target = action.to.toLowerCase();
    const abi = target === ADDRESSES.ACL.toLowerCase() ? ACL_ABI
      : target === ADDRESSES.CONVICTION_VOTING.toLowerCase() ? CONVICTION_ABI
        : target === ADDRESSES.COMMON_POOL.toLowerCase() ? AGENT_ABI
          : undefined;
    if (!abi) throw new Error(`No decoder ABI for action target ${action.to}.`);
    const decoded = decodeFunctionData({ abi, data: action.data });
    return {
      index,
      label: action.label,
      target: action.to,
      selector: action.data.slice(0, 10) as Hex,
      calldata: action.data,
      decoded: {
        contract: target === ADDRESSES.ACL.toLowerCase() ? 'ACL' : target === ADDRESSES.CONVICTION_VOTING.toLowerCase() ? 'ConvictionVoting' : 'CommonPoolAgent',
        function: decoded.functionName,
        args: decodeArgs(decoded.functionName, decoded.args)
      }
    };
  });
}

function votePreview(script: Hex, phase: 1 | 2, commit: string): UnsignedVotePreview {
  const context = `${REPOSITORY_URL}/blob/${commit}/README.md#vote-${phase}`;
  const contextBytes = stringToHex(context);
  return {
    schemaVersion: 1,
    chainId: 100,
    from: null,
    to: ADDRESSES.DECISION_VOTING,
    value: '0',
    method: 'newVote(bytes,bytes)',
    context,
    contextBytes,
    executionScriptHash: keccak256(script),
    data: encodeFunctionData({ abi: DECISION_ABI, functionName: 'newVote', args: [script, contextBytes] }),
    simulation: { status: 'not-run', reason: 'Vote creation requires the eventual proposer account and collateral state; the complete lifecycle is simulated by verify:fork.' }
  };
}

function bundleReadme(metadata: BundleMetadata): string {
  return `# Gardens v1 deprecation review bundle

This bundle is unsigned verification evidence. It cannot sign or submit a transaction.

## Snapshot

- Source commit: \`${metadata.sourceCommit}\`
- Gnosis block: \`${metadata.snapshot.blockNumber}\` / \`${metadata.snapshot.blockHash}\`
- Replacement authority: \`${metadata.authority.address}\` (${metadata.authority.kind})
- Common Pool HNY: \`${metadata.snapshot.commonPoolHnyWei}\` wei (${metadata.snapshot.commonPoolHny} HNY)
- Active Decision votes: ${metadata.snapshot.activeDecisionVotes.length}
- Readable active Conviction proposals: ${metadata.snapshot.activeConvictionProposals.length}
- Conviction proposal IDs that reverted during direct reads: ${metadata.snapshot.unreadableConvictionProposalIds.length === 0 ? 'none' : metadata.snapshot.unreadableConvictionProposalIds.join(', ')}

## Vote 1

- Purpose: operational shutdown, issuance removal, and Common Pool transfer
- Actions: 35
- Execution-script hash: \`${metadata.vote1.scriptHash}\`

## Vote 2

- Purpose: retire Decision Voting and transfer reviewed permission managers
- Actions: 56
- Execution-script hash: \`${metadata.vote2.scriptHash}\`

The shared Celeste Court is not targeted. External review is encouraged but advisory; live-state, exact-hash, and fork checks remain mandatory.

An unreadable Conviction proposal is reported rather than silently classified. Historical proposals can revert because the legacy SlidingWindowOracle lacks an observation; operators must cross-check every reported ID before production.

Run \`npm run verify:bundle -- --bundle <directory>\` and \`GNOSIS_RPC_URL=... npm run verify:fork -- --bundle <directory>\` from the source commit above.
`;
}

export async function writeChecksums(directory: string): Promise<void> {
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name !== 'checksums.txt')
    .map((entry) => entry.name)
    .sort();
  const lines: string[] = [];
  for (const file of files) {
    const contents = await readFile(path.join(directory, file));
    lines.push(`${createHash('sha256').update(contents).digest('hex')}  ${file}`);
  }
  await writeFile(path.join(directory, 'checksums.txt'), `${lines.join('\n')}\n`);
}

export async function exportBundle(config: ProposalConfig, rpcUrl: string, outDirectory: string): Promise<BundleMetadata> {
  const commit = sourceCommit();
  const { snapshot, authority } = await readSnapshot(config, rpcUrl);
  const shutdown = buildShutdown(config.replacementAuthority, BigInt(snapshot.commonPoolHnyWei));
  const authorityTransfer = buildAuthorityTransfer(config.replacementAuthority);
  if (shutdown.actions.length !== 35 || authorityTransfer.actions.length !== 56) throw new Error('Unexpected action count.');
  const vote1Manifest = manifestFor(shutdown.actions);
  const vote2Manifest = manifestFor(authorityTransfer.actions);
  const metadata: BundleMetadata = {
    schemaVersion: 1,
    generatedAt: snapshot.timestamp,
    sourceCommit: commit,
    config,
    snapshot,
    authority,
    vote1: { actionCount: 35, scriptHash: keccak256(shutdown.executionScript) },
    vote2: { actionCount: 56, scriptHash: keccak256(authorityTransfer.executionScript) }
  };

  await mkdir(outDirectory, { recursive: true });
  const files: Record<string, string> = {
    'README.md': bundleReadme(metadata),
    'metadata.json': json(metadata),
    'snapshot.json': json(snapshot),
    'authority.json': json(authority),
    'vote-1-manifest.json': json(vote1Manifest),
    'vote-1-script.hex': `${shutdown.executionScript}\n`,
    'vote-1-preview.json': json(votePreview(shutdown.executionScript, 1, commit)),
    'vote-2-manifest.json': json(vote2Manifest),
    'vote-2-script.hex': `${authorityTransfer.executionScript}\n`,
    'vote-2-preview.json': json(votePreview(authorityTransfer.executionScript, 2, commit)),
    'fork-report.md': '# Fork report\n\nStatus: not run. Run `npm run verify:fork -- --bundle <directory>`.\n'
  };
  for (const [name, contents] of Object.entries(files)) await writeFile(path.join(outDirectory, name), contents);
  await writeChecksums(outDirectory);
  return metadata;
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} does not match deterministic reconstruction.`);
}

export async function verifyBundle(directory: string): Promise<BundleMetadata> {
  const checksumLines = (await readFile(path.join(directory, 'checksums.txt'), 'utf8')).trim().split('\n').filter(Boolean);
  for (const line of checksumLines) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!match) throw new Error(`Malformed checksum line: ${line}`);
    const contents = await readFile(path.join(directory, match[2]!));
    const actual = createHash('sha256').update(contents).digest('hex');
    if (actual !== match[1]) throw new Error(`Checksum mismatch for ${match[2]}.`);
  }

  const metadata = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8')) as BundleMetadata;
  const shutdown = buildShutdown(metadata.config.replacementAuthority, BigInt(metadata.snapshot.commonPoolHnyWei));
  const authorityTransfer = buildAuthorityTransfer(metadata.config.replacementAuthority);
  const script1 = (await readFile(path.join(directory, 'vote-1-script.hex'), 'utf8')).trim();
  const script2 = (await readFile(path.join(directory, 'vote-2-script.hex'), 'utf8')).trim();
  if (script1 !== shutdown.executionScript || script2 !== authorityTransfer.executionScript) throw new Error('Execution-script bytes do not match reconstruction.');
  if (metadata.vote1.scriptHash !== keccak256(shutdown.executionScript) || metadata.vote2.scriptHash !== keccak256(authorityTransfer.executionScript)) throw new Error('Execution-script hash mismatch.');
  assertEqual(JSON.parse(await readFile(path.join(directory, 'vote-1-manifest.json'), 'utf8')), manifestFor(shutdown.actions), 'Vote 1 manifest');
  assertEqual(JSON.parse(await readFile(path.join(directory, 'vote-2-manifest.json'), 'utf8')), manifestFor(authorityTransfer.actions), 'Vote 2 manifest');
  assertEqual(decodeCallScript(script1 as Hex), shutdown.actions.map(({ to, data }) => ({ to: to.toLowerCase(), data })), 'Vote 1 CallScript decode');
  assertEqual(decodeCallScript(script2 as Hex), authorityTransfer.actions.map(({ to, data }) => ({ to: to.toLowerCase(), data })), 'Vote 2 CallScript decode');
  assertEqual(JSON.parse(await readFile(path.join(directory, 'vote-1-preview.json'), 'utf8')), votePreview(shutdown.executionScript, 1, metadata.sourceCommit), 'Vote 1 preview');
  assertEqual(JSON.parse(await readFile(path.join(directory, 'vote-2-preview.json'), 'utf8')), votePreview(authorityTransfer.executionScript, 2, metadata.sourceCommit), 'Vote 2 preview');
  return metadata;
}
