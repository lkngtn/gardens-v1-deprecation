import { createPublicClient, formatUnits, http, keccak256 } from 'viem';
import { ACL_ABI, CONVICTION_ABI, DECISION_ABI, ERC20_ABI, SAFE_ABI } from './abis.js';
import { ADDRESSES, SNAPSHOT_CONTRACTS } from './addresses.js';
import {
  AUTHORITY_REVOKED_GRANTS,
  MANAGER_ROLES,
  PRESERVED_GRANTS,
  SHUTDOWN_REVOKED_GRANTS,
  type PermissionGrant
} from './manifest.js';
import type { Address, AuthorityEvidence, Hex, ProposalConfig, Snapshot } from './types.js';

export function createGnosisClient(rpcUrl: string) {
  return createPublicClient({ transport: http(rpcUrl) });
}

function blockNumberFromConfig(config: ProposalConfig): bigint | undefined {
  return config.snapshotBlock === 'latest' ? undefined : BigInt(config.snapshotBlock);
}

async function readGrant(client: ReturnType<typeof createGnosisClient>, item: PermissionGrant, blockNumber: bigint): Promise<Snapshot['grants'][number]> {
  const present = await client.readContract({
    address: ADDRESSES.ACL,
    abi: ACL_ABI,
    functionName: 'hasPermission',
    args: [item.entity, item.app, item.role],
    blockNumber
  });
  return { ...item, present };
}

export async function readSnapshot(config: ProposalConfig, rpcUrl: string): Promise<{ snapshot: Snapshot; authority: AuthorityEvidence }> {
  const client = createGnosisClient(rpcUrl);
  const chainId = await client.getChainId();
  if (chainId !== 100) throw new Error(`GNOSIS_RPC_URL is connected to chain ${chainId}; expected chain 100.`);

  const configuredBlock = blockNumberFromConfig(config);
  const block = await client.getBlock(configuredBlock === undefined ? {} : { blockNumber: configuredBlock });
  if (!block.hash) throw new Error('Snapshot block has no hash.');
  const blockNumber = block.number;

  const contracts: Snapshot['contracts'] = {};
  for (const [name, address] of Object.entries(SNAPSHOT_CONTRACTS)) {
    const bytecode = await client.getBytecode({ address, blockNumber });
    if (!bytecode || bytecode === '0x') throw new Error(`Missing bytecode for ${name} at ${address}.`);
    contracts[name] = { address, bytecodeHash: keccak256(bytecode) };
  }

  const managers: Snapshot['managers'] = [];
  for (const item of MANAGER_ROLES) {
    const manager = await client.readContract({ address: ADDRESSES.ACL, abi: ACL_ABI, functionName: 'getPermissionManager', args: [item.app, item.role], blockNumber });
    managers.push({ ...item, manager });
    if (manager.toLowerCase() !== ADDRESSES.DECISION_VOTING.toLowerCase()) throw new Error(`Manager drift for ${item.label}: ${manager}.`);
  }

  const expectedPresent = [...PRESERVED_GRANTS, ...SHUTDOWN_REVOKED_GRANTS.slice(2), ...AUTHORITY_REVOKED_GRANTS];
  const expectedAbsent = SHUTDOWN_REVOKED_GRANTS.slice(0, 2);
  const grants: Snapshot['grants'] = [];
  for (const item of expectedPresent) {
    const result = await readGrant(client, item, blockNumber);
    grants.push(result);
    if (!result.present) throw new Error(`Expected grant is absent: ${item.label}.`);
  }
  for (const item of expectedAbsent) {
    const result = await readGrant(client, item, blockNumber);
    grants.push(result);
    if (result.present) throw new Error(`Temporary grant already exists: ${item.label}.`);
  }

  const [commonPoolHnyWei, convictionPaused, decisionVotesLength] = await Promise.all([
    client.readContract({ address: ADDRESSES.HNY, abi: ERC20_ABI, functionName: 'balanceOf', args: [ADDRESSES.COMMON_POOL], blockNumber }),
    client.readContract({ address: ADDRESSES.CONVICTION_VOTING, abi: CONVICTION_ABI, functionName: 'contractPaused', blockNumber }),
    client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'votesLength', blockNumber })
  ]);
  if (commonPoolHnyWei <= 0n) throw new Error('Common Pool HNY balance must be greater than zero.');
  if (convictionPaused) throw new Error('Conviction Voting is already paused; expected pre-Vote-1 state.');

  const activeDecisionVotes: Snapshot['activeDecisionVotes'] = [];
  for (let voteId = 0n; voteId < decisionVotesLength; voteId += 1n) {
    const [vote, openForVoting, canExecute] = await Promise.all([
      client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'getVote', args: [voteId], blockNumber }),
      client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'isVoteOpenForVoting', args: [voteId], blockNumber }),
      client.readContract({ address: ADDRESSES.DECISION_VOTING, abi: DECISION_ABI, functionName: 'canExecute', args: [voteId], blockNumber })
    ]);
    const status = Number(vote[5]);
    if (openForVoting || canExecute || status === 1) activeDecisionVotes.push({ voteId: voteId.toString(), actionId: vote[7].toString(), status, openForVoting, canExecute });
  }

  const activeConvictionProposals: Snapshot['activeConvictionProposals'] = [];
  const unreadableConvictionProposalIds: string[] = [];
  let consecutiveEmpty = 0;
  let proposalId = 2n;
  let lastExistingProposalId = 1n;
  while (proposalId <= 1000n && consecutiveEmpty < 20) {
    const batch = Array.from({ length: Math.min(20, 1001 - Number(proposalId)) }, (_, offset) => proposalId + BigInt(offset));
    const proposals = await Promise.all(batch.map(async (id) => {
      try {
        return { id, value: await client.readContract({ address: ADDRESSES.CONVICTION_VOTING, abi: CONVICTION_ABI, functionName: 'getProposal', args: [id], blockNumber }) } as const;
      } catch {
        return { id, value: null } as const;
      }
    }));
    for (const { id, value } of proposals) {
      if (value === null) {
        unreadableConvictionProposalIds.push(id.toString());
        consecutiveEmpty = 0;
        lastExistingProposalId = id;
        continue;
      }
      const empty = value[8].toLowerCase() === '0x0000000000000000000000000000000000000000';
      if (empty) {
        consecutiveEmpty += 1;
      } else {
        consecutiveEmpty = 0;
        lastExistingProposalId = id;
        if (Number(value[7]) === 0) activeConvictionProposals.push({ proposalId: id.toString(), agreementActionId: value[6].toString(), stakedTokensWei: value[3].toString() });
      }
      if (consecutiveEmpty >= 20) break;
    }
    proposalId += BigInt(batch.length);
  }
  if (proposalId > 1000n && consecutiveEmpty < 20) throw new Error('Conviction proposal scan reached its safety cap without finding the end of the sequence.');

  const authorityCode = await client.getBytecode({ address: config.replacementAuthority, blockNumber });
  let authority: AuthorityEvidence;
  if (config.kind === 'design') {
    authority = { schemaVersion: 1, kind: 'design-eoa', address: config.replacementAuthority, bytecodeHash: authorityCode && authorityCode !== '0x' ? keccak256(authorityCode) : null, owners: [], threshold: 0, chainId: 100 };
  } else {
    if (!authorityCode || authorityCode === '0x') throw new Error('Production replacement authority has no deployed bytecode.');
    const [owners, threshold] = await Promise.all([
      client.readContract({ address: config.replacementAuthority, abi: SAFE_ABI, functionName: 'getOwners', blockNumber }),
      client.readContract({ address: config.replacementAuthority, abi: SAFE_ABI, functionName: 'getThreshold', blockNumber })
    ]);
    const actual = [...owners].map((owner) => owner.toLowerCase()).sort();
    const expected = config.expectedSafeOwners.map((owner) => owner.toLowerCase()).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Safe owners do not match config. Actual: ${owners.join(', ')}`);
    if (Number(threshold) !== config.expectedSafeThreshold) throw new Error(`Safe threshold ${threshold} does not match expected ${config.expectedSafeThreshold}.`);
    authority = { schemaVersion: 1, kind: 'safe', address: config.replacementAuthority, bytecodeHash: keccak256(authorityCode), owners: [...owners] as Address[], threshold: Number(threshold), chainId: 100 };
  }

  return {
    snapshot: {
      schemaVersion: 1,
      chainId: 100,
      blockNumber: blockNumber.toString(),
      blockHash: block.hash as Hex,
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      contracts,
      commonPoolHnyWei: commonPoolHnyWei.toString(),
      commonPoolHny: formatUnits(commonPoolHnyWei, 18),
      convictionPaused,
      decisionVotesLength: decisionVotesLength.toString(),
      activeDecisionVotes,
      activeConvictionProposals,
      unreadableConvictionProposalIds,
      convictionProposalScan: { firstProposalId: '2', lastExistingProposalId: lastExistingProposalId.toString(), stoppedAfterConsecutiveEmpty: 20 },
      grants,
      managers
    },
    authority
  };
}
