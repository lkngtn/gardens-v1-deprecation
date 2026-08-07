export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type ProposalConfig = {
  schemaVersion: 1;
  kind: 'design' | 'production';
  chainId: 100;
  snapshotBlock: 'latest' | string;
  replacementAuthority: Address;
  expectedSafeOwners: Address[];
  expectedSafeThreshold: number;
};

export type CallScriptAction = {
  index: number;
  label: string;
  target: Address;
  selector: Hex;
  calldata: Hex;
  decoded: {
    contract: string;
    function: string;
    args: Record<string, string | boolean>;
  };
};

export type SnapshotGrant = {
  label: string;
  entity: Address;
  app: Address;
  role: Hex;
  present: boolean;
};

export type SnapshotManager = {
  label: string;
  app: Address;
  role: Hex;
  manager: Address;
};

export type Snapshot = {
  schemaVersion: 1;
  chainId: 100;
  blockNumber: string;
  blockHash: Hex;
  timestamp: string;
  contracts: Record<string, { address: Address; bytecodeHash: Hex }>;
  commonPoolHnyWei: string;
  commonPoolHny: string;
  convictionPaused: boolean;
  decisionVotesLength: string;
  grants: SnapshotGrant[];
  managers: SnapshotManager[];
};

export type AuthorityEvidence = {
  schemaVersion: 1;
  kind: 'design-eoa' | 'safe';
  address: Address;
  bytecodeHash: Hex | null;
  owners: Address[];
  threshold: number;
  chainId: 100;
};

export type UnsignedVotePreview = {
  schemaVersion: 1;
  chainId: 100;
  from: null;
  to: Address;
  value: '0';
  method: 'newVote(bytes,bytes)';
  context: string;
  contextBytes: Hex;
  executionScriptHash: Hex;
  data: Hex;
  simulation: { status: 'not-run'; reason: string };
};

export type BundleMetadata = {
  schemaVersion: 1;
  generatedAt: string;
  sourceCommit: string;
  config: ProposalConfig;
  snapshot: Snapshot;
  authority: AuthorityEvidence;
  vote1: { actionCount: 35; scriptHash: Hex };
  vote2: { actionCount: 56; scriptHash: Hex };
};
