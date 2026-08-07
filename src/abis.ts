export const ACL_ABI = [
  { type: 'function', name: 'grantPermission', stateMutability: 'nonpayable', inputs: [{ name: '_entity', type: 'address' }, { name: '_app', type: 'address' }, { name: '_role', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'revokePermission', stateMutability: 'nonpayable', inputs: [{ name: '_entity', type: 'address' }, { name: '_app', type: 'address' }, { name: '_role', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'setPermissionManager', stateMutability: 'nonpayable', inputs: [{ name: '_newManager', type: 'address' }, { name: '_app', type: 'address' }, { name: '_role', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'getPermissionManager', stateMutability: 'view', inputs: [{ name: '_app', type: 'address' }, { name: '_role', type: 'bytes32' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'hasPermission', stateMutability: 'view', inputs: [{ name: '_who', type: 'address' }, { name: '_where', type: 'address' }, { name: '_what', type: 'bytes32' }], outputs: [{ type: 'bool' }] }
] as const;

export const CONVICTION_ABI = [
  { type: 'function', name: 'pauseContract', stateMutability: 'nonpayable', inputs: [{ name: '_pauseEnabled', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'contractPaused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'stakeToProposal', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }, { name: '_amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdrawFromProposal', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }, { name: '_amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'getProposal', stateMutability: 'view', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [{ name: 'requestedAmount', type: 'uint256' }, { name: 'stableRequestAmount', type: 'bool' }, { name: 'beneficiary', type: 'address' }, { name: 'stakedTokens', type: 'uint256' }, { name: 'convictionLast', type: 'uint256' }, { name: 'blockLast', type: 'uint64' }, { name: 'agreementActionId', type: 'uint256' }, { name: 'proposalStatus', type: 'uint8' }, { name: 'submitter', type: 'address' }, { name: 'threshold', type: 'uint256' }] }
] as const;

export const AGENT_ABI = [
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: '_token', type: 'address' }, { name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [] }
] as const;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: '_owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ type: 'bool' }] }
] as const;

export const DECISION_ABI = [
  { type: 'event', name: 'StartVote', inputs: [{ name: 'voteId', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'context', type: 'bytes', indexed: false }, { name: 'executionScript', type: 'bytes', indexed: false }] },
  { type: 'function', name: 'newVote', stateMutability: 'nonpayable', inputs: [{ name: '_executionScript', type: 'bytes' }, { name: '_context', type: 'bytes' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'vote', stateMutability: 'nonpayable', inputs: [{ name: '_voteId', type: 'uint256' }, { name: '_supports', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'executeVote', stateMutability: 'nonpayable', inputs: [{ name: '_voteId', type: 'uint256' }, { name: '_executionScript', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'getVote', stateMutability: 'view', inputs: [{ name: '_voteId', type: 'uint256' }], outputs: [{ name: 'yea', type: 'uint256' }, { name: 'nay', type: 'uint256' }, { name: 'totalPower', type: 'uint256' }, { name: 'startDate', type: 'uint64' }, { name: 'snapshotBlock', type: 'uint64' }, { name: 'status', type: 'uint8' }, { name: 'settingId', type: 'uint256' }, { name: 'actionId', type: 'uint256' }, { name: 'pausedAt', type: 'uint64' }, { name: 'pauseDuration', type: 'uint64' }, { name: 'quietEndingExtensionDuration', type: 'uint64' }, { name: 'quietEndingSnapshotSupport', type: 'uint8' }, { name: 'executionScriptHash', type: 'bytes32' }] },
  { type: 'function', name: 'getSetting', stateMutability: 'view', inputs: [{ name: '_settingId', type: 'uint256' }], outputs: [{ name: 'voteTime', type: 'uint64' }, { name: 'supportRequiredPct', type: 'uint64' }, { name: 'minAcceptQuorumPct', type: 'uint64' }, { name: 'delegatedVotingPeriod', type: 'uint64' }, { name: 'quietEndingPeriod', type: 'uint64' }, { name: 'quietEndingExtension', type: 'uint64' }, { name: 'executionDelay', type: 'uint64' }] },
  { type: 'function', name: 'canExecute', stateMutability: 'view', inputs: [{ name: '_voteId', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'isVoteOpenForVoting', stateMutability: 'view', inputs: [{ name: '_voteId', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'votesLength', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
] as const;

export const AGREEMENT_ABI = [
  { type: 'function', name: 'getCurrentSettingId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sign', stateMutability: 'nonpayable', inputs: [{ name: '_settingId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'getSigner', stateMutability: 'view', inputs: [{ name: '_signer', type: 'address' }], outputs: [{ name: 'lastSettingIdSigned', type: 'uint256' }, { name: 'mustSign', type: 'bool' }] }
] as const;

export const STAKING_ABI = [
  { type: 'function', name: 'stake', stateMutability: 'nonpayable', inputs: [{ name: '_amount', type: 'uint256' }, { name: '_data', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'allowManager', stateMutability: 'nonpayable', inputs: [{ name: '_lockManager', type: 'address' }, { name: '_allowance', type: 'uint256' }, { name: '_data', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'increaseLockAllowance', stateMutability: 'nonpayable', inputs: [{ name: '_lockManager', type: 'address' }, { name: '_allowance', type: 'uint256' }], outputs: [] }
] as const;

export const SAFE_ABI = [
  { type: 'function', name: 'getOwners', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { type: 'function', name: 'getThreshold', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
] as const;
