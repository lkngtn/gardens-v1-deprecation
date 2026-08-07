import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createPublicClient,
  encodeFunctionData,
  formatUnits,
  http,
  keccak256,
  parseEventLogs,
  parseUnits,
  stringToHex,
  type Hash
} from 'viem';
import { ACL_ABI, AGREEMENT_ABI, CONVICTION_ABI, DECISION_ABI, ERC20_ABI, STAKING_ABI } from './abis.js';
import { ADDRESSES } from './addresses.js';
import { ALL_REVOKED_GRANTS, AUTHORITY_REVOKED_GRANTS, MANAGER_ROLES, PRESERVED_GRANTS, SAFE_DIRECT_ROLES, SHUTDOWN_REVOKED_GRANTS } from './manifest.js';
import { verifyBundle, writeChecksums } from './bundle.js';
import type { Address, Hex } from './types.js';

const ACTOR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address;
const LIQUIDITY_PAIR = '0x4505b262DC053998C10685DC5F9098af8AE5C8ad' as Address;
const VOTING_POWER = parseUnits('12000', 18);
const CONVICTION_STAKE = parseUnits('1', 18);
const AGREEMENT_STAKE = parseUnits('10', 18);
const EXPECTED_ANVIL_VERSION = '1.7.1';

async function openPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Could not allocate local Anvil port.'));
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForRpc(url: string, process: ChildProcess): Promise<void> {
  const client = createPublicClient({ transport: http(url) });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Anvil exited with code ${process.exitCode}.`);
    try {
      if (await client.getChainId() === 31337) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for Anvil.');
}

async function startAnvil(upstreamUrl: string, blockNumber: string): Promise<{ process: ChildProcess; url: string }> {
  const version = execFileSync('anvil', ['--version'], { encoding: 'utf8' });
  if (!version.includes(`Version: ${EXPECTED_ANVIL_VERSION}`)) {
    throw new Error(`Expected Anvil ${EXPECTED_ANVIL_VERSION}; received: ${version.split('\n')[0] ?? 'unknown'}.`);
  }
  const port = await openPort();
  const process = spawn('anvil', [
    '--fork-url', upstreamUrl,
    '--fork-block-number', blockNumber,
    '--chain-id', '31337',
    '--port', String(port),
    '--gas-limit', '17000000',
    '--silent'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const url = `http://127.0.0.1:${port}`;
  await waitForRpc(url, process);
  return { process, url };
}

function forkClient(url: string) {
  return createPublicClient({ transport: http(url) });
}

async function rpc(client: ReturnType<typeof forkClient>, method: string, params: unknown[] = []): Promise<unknown> {
  return client.request({ method, params } as never);
}

async function impersonate(client: ReturnType<typeof forkClient>, address: Address): Promise<void> {
  await rpc(client, 'anvil_impersonateAccount', [address]);
  await rpc(client, 'anvil_setBalance', [address, '0x56BC75E2D63100000']);
}

async function send(client: ReturnType<typeof forkClient>, from: Address, to: Address, data: Hex): Promise<{ hash: Hash; gasUsed: bigint }> {
  await impersonate(client, from);
  const hash = await rpc(client, 'eth_sendTransaction', [{ from, to, value: '0x0', data }]) as Hash;
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`Fork transaction reverted: ${hash}.`);
  return { hash, gasUsed: receipt.gasUsed };
}

async function transfer(client: ReturnType<typeof forkClient>, source: Address, destination: Address, amount: bigint): Promise<void> {
  await send(client, source, ADDRESSES.HNY, encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [destination, amount] }));
}

async function actorBalance(client: ReturnType<typeof forkClient>): Promise<bigint> {
  return client.readContract({ address: ADDRESSES.HNY, abi: ERC20_ABI, functionName: 'balanceOf', args: [ACTOR] });
}

async function prepareActor(client: ReturnType<typeof forkClient>): Promise<void> {
  await transfer(client, ADDRESSES.COMMON_POOL, ACTOR, VOTING_POWER);
  const signer = await client.readContract({ address: ADDRESSES.AGREEMENT, abi: AGREEMENT_ABI, functionName: 'getSigner', args: [ACTOR] });
  if (signer[1]) {
    const setting = await client.readContract({ address: ADDRESSES.AGREEMENT, abi: AGREEMENT_ABI, functionName: 'getCurrentSettingId' });
    await send(client, ACTOR, ADDRESSES.AGREEMENT, encodeFunctionData({ abi: AGREEMENT_ABI, functionName: 'sign', args: [setting] }));
  }
  await send(client, ACTOR, ADDRESSES.CONVICTION_VOTING, encodeFunctionData({ abi: CONVICTION_ABI, functionName: 'stakeToProposal', args: [1n, CONVICTION_STAKE] }));
  await send(client, ACTOR, ADDRESSES.HNY, encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.HONEY_STAKING, AGREEMENT_STAKE] }));
  await send(client, ACTOR, ADDRESSES.HONEY_STAKING, encodeFunctionData({ abi: STAKING_ABI, functionName: 'stake', args: [AGREEMENT_STAKE, '0x'] }));
  await send(client, ACTOR, ADDRESSES.HONEY_STAKING, encodeFunctionData({ abi: STAKING_ABI, functionName: 'allowManager', args: [ADDRESSES.AGREEMENT, AGREEMENT_STAKE, '0x'] }));
}

async function createAndVote(client: ReturnType<typeof forkClient>, script: Hex, context: string): Promise<bigint> {
  const before = await client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'votesLength' });
  const tx = await send(client, ACTOR, ADDRESSES.DECISION_VOTING, encodeFunctionData({ abi: DECISION_ABI, functionName: 'newVote', args: [script, stringToHex(context)] }));
  const receipt = await client.getTransactionReceipt({ hash: tx.hash });
  const events = parseEventLogs({ abi: DECISION_ABI, logs: receipt.logs, eventName: 'StartVote' });
  const voteId = events[0]?.args.voteId ?? before;
  await send(client, ACTOR, ADDRESSES.DECISION_VOTING, encodeFunctionData({ abi: DECISION_ABI, functionName: 'vote', args: [voteId, true] }));
  return voteId;
}

async function makeExecutable(client: ReturnType<typeof forkClient>, voteId: bigint): Promise<void> {
  const vote = await client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'getVote', args: [voteId] });
  const setting = await client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'getSetting', args: [vote[6]] });
  await rpc(client, 'evm_increaseTime', [Number(setting[0] + setting[6] + 100n)]);
  await rpc(client, 'evm_mine');
  const canExecute = await client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'canExecute', args: [voteId] });
  if (!canExecute) throw new Error(`Vote ${voteId} did not become executable.`);
}

async function restoreCommonPool(client: ReturnType<typeof forkClient>, expected: bigint): Promise<void> {
  const liquid = await actorBalance(client);
  if (liquid > 0n) await transfer(client, ACTOR, ADDRESSES.COMMON_POOL, liquid);
  const actual = await client.readContract({ address: ADDRESSES.HNY, abi: ERC20_ABI, functionName: 'balanceOf', args: [ADDRESSES.COMMON_POOL] });
  if (actual < expected) await transfer(client, LIQUIDITY_PAIR, ADDRESSES.COMMON_POOL, expected - actual);
  const restored = await client.readContract({ address: ADDRESSES.HNY, abi: ERC20_ABI, functionName: 'balanceOf', args: [ADDRESSES.COMMON_POOL] });
  if (restored !== expected) throw new Error(`Failed to restore exact Common Pool snapshot: ${restored}/${expected}.`);
}

async function assertVote1(client: ReturnType<typeof forkClient>, authority: Address, originalPool: bigint): Promise<void> {
  const [pool, authorityBalance, paused] = await Promise.all([
    client.readContract({ address: ADDRESSES.HNY, abi: ERC20_ABI, functionName: 'balanceOf', args: [ADDRESSES.COMMON_POOL] }),
    client.readContract({ address: ADDRESSES.HNY, abi: ERC20_ABI, functionName: 'balanceOf', args: [authority] }),
    client.readContract({ address: ADDRESSES.CONVICTION_VOTING, abi: CONVICTION_ABI, functionName: 'contractPaused' })
  ]);
  if (pool !== 0n || authorityBalance < originalPool || !paused) throw new Error('Vote 1 treasury or pause postcondition failed.');
  for (const item of SAFE_DIRECT_ROLES) {
    if (!await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'hasPermission', args: [authority, item.app, item.role] })) throw new Error(`Missing authority grant: ${item.label}.`);
  }
  for (const item of SHUTDOWN_REVOKED_GRANTS) {
    if (await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'hasPermission', args: [item.entity, item.app, item.role] })) throw new Error(`Vote 1 failed to revoke ${item.label}.`);
  }
  for (const item of AUTHORITY_REVOKED_GRANTS) {
    if (!await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'hasPermission', args: [item.entity, item.app, item.role] })) throw new Error(`Vote 1 unexpectedly revoked ${item.label}.`);
  }
  for (const item of MANAGER_ROLES) {
    const manager = await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'getPermissionManager', args: [item.app, item.role] });
    if (manager.toLowerCase() !== ADDRESSES.DECISION_VOTING.toLowerCase()) throw new Error(`Vote 1 changed manager ${item.label}.`);
  }
}

async function assertVote2(client: ReturnType<typeof forkClient>, authority: Address, courtHash: Hex): Promise<void> {
  for (const item of MANAGER_ROLES) {
    const manager = await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'getPermissionManager', args: [item.app, item.role] });
    if (manager.toLowerCase() !== authority.toLowerCase()) throw new Error(`Manager not transferred: ${item.label}.`);
  }
  for (const item of ALL_REVOKED_GRANTS) {
    if (await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'hasPermission', args: [item.entity, item.app, item.role] })) throw new Error(`Final grant remains: ${item.label}.`);
  }
  for (const item of PRESERVED_GRANTS) {
    if (!await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'hasPermission', args: [item.entity, item.app, item.role] })) throw new Error(`Preserved grant missing: ${item.label}.`);
  }
  const courtCode = await client.getBytecode({ address: ADDRESSES.CELESTE_COURT });
  if (!courtCode || keccak256(courtCode) !== courtHash) throw new Error('Celeste Court bytecode changed.');
}

export async function verifyFork(bundleDirectory: string, upstreamUrl: string): Promise<void> {
  const metadata = await verifyBundle(bundleDirectory);
  const script1 = (await readFile(path.join(bundleDirectory, 'vote-1-script.hex'), 'utf8')).trim() as Hex;
  const script2 = (await readFile(path.join(bundleDirectory, 'vote-2-script.hex'), 'utf8')).trim() as Hex;
  const anvil = await startAnvil(upstreamUrl, metadata.snapshot.blockNumber);
  try {
    const client = forkClient(anvil.url);
    const chainId = await client.getChainId();
    if (chainId !== 31337) throw new Error(`Fork mutation requires chain 31337; received ${chainId}.`);
    const courtCode = await client.getBytecode({ address: ADDRESSES.CELESTE_COURT });
    if (!courtCode) throw new Error('Celeste Court bytecode missing on fork.');
    const courtHash = keccak256(courtCode);
    const commonPoolSnapshot = BigInt(metadata.snapshot.commonPoolHnyWei);

    await prepareActor(client);
    const vote1 = await createAndVote(client, script1, 'gardens-v1-deprecation:vote-1');
    await restoreCommonPool(client, commonPoolSnapshot);
    await makeExecutable(client, vote1);
    const executed1 = await send(client, ACTOR, ADDRESSES.DECISION_VOTING, encodeFunctionData({ abi: DECISION_ABI, functionName: 'executeVote', args: [vote1, script1] }));
    await assertVote1(client, metadata.authority.address, commonPoolSnapshot);
    await send(client, ACTOR, ADDRESSES.CONVICTION_VOTING, encodeFunctionData({ abi: CONVICTION_ABI, functionName: 'withdrawFromProposal', args: [1n, CONVICTION_STAKE] }));

    await transfer(client, metadata.authority.address, ACTOR, VOTING_POWER);
    const vote2 = await createAndVote(client, script2, 'gardens-v1-deprecation:vote-2');
    const remaining = await actorBalance(client);
    if (remaining > 0n) await transfer(client, ACTOR, metadata.authority.address, remaining);
    await makeExecutable(client, vote2);
    const executed2 = await send(client, ACTOR, ADDRESSES.DECISION_VOTING, encodeFunctionData({ abi: DECISION_ABI, functionName: 'executeVote', args: [vote2, script2] }));
    await assertVote2(client, metadata.authority.address, courtHash);

    const block1 = await client.getTransactionReceipt({ hash: executed1.hash });
    const block2 = await client.getTransactionReceipt({ hash: executed2.hash });
    const report = `# Fork report

Status: pass

- Fork chain: 31337
- Gnosis source block: ${metadata.snapshot.blockNumber} / ${metadata.snapshot.blockHash}
- Anvil gas limit: 17000000
- Fork actor: ${ACTOR} (impersonated; no private key accepted)
- Vote 1 ID: ${vote1}
- Vote 1 gas used: ${block1.gasUsed}
- Vote 2 ID: ${vote2}
- Vote 2 gas used: ${block2.gasUsed}
- Common Pool snapshot: ${commonPoolSnapshot} wei (${formatUnits(commonPoolSnapshot, 18)} HNY)
- Vote 1 script hash: ${keccak256(script1)}
- Vote 2 script hash: ${keccak256(script2)}
- Intermediate and final ACL assertions: pass
- Conviction withdrawal after pause: pass
- Celeste Court bytecode unchanged: pass

The harness temporarily impersonates fork accounts and restores the exact Common Pool balance before Vote 1 execution. It refuses mutation unless the local chain ID is 31337.
`;
    await writeFile(path.join(bundleDirectory, 'fork-report.md'), report);
    await writeChecksums(bundleDirectory);
  } finally {
    anvil.process.kill('SIGTERM');
  }
}
