# Gardens v1 deprecation

This repository lets anyone reconstruct and test the two Decision votes proposed to deprecate Gardens v1 and its Celeste integration on Gnosis Chain.

It is deliberately read-only on chain ID 100. It contains no wallet, signer, private-key, keeper, or transaction-submission capability. The only transactions it can send are to an Anvil process it starts on chain ID 31337.

Read the complete [proposal](docs/PROPOSAL.md) before relying on any artifact.

## Outcome

### Vote 1

The 35-action operational shutdown vote:

- pauses Conviction Voting while preserving withdrawals;
- transfers the Common Pool's exact snapshotted HNY balance to the replacement Safe;
- removes Dynamic Issuance's HNY mint and burn permissions;
- removes public Conviction proposal/challenge access and its Agreement link; and
- gives the replacement Safe 22 direct recovery and administrative permissions.

### Vote 2

The 56-action authority-transfer vote:

- removes Decision Voting's 20 administrative grants;
- removes public Decision vote/challenge access and its Agreement link; and
- moves all 33 reviewed permission-manager slots to the replacement Safe, transferring `ACL.CREATE_PERMISSIONS_ROLE` last.

The shared Celeste Court is never targeted.

## Install and inspect

Requirements: Node 22, npm 10.9.8, Anvil 1.7.1 or a reviewed compatible version, and an archive-capable Gnosis RPC for historical releases.

```bash
npm ci
npm run check
npm run verify:bundle -- --bundle releases/proposal-v1.0.0
GNOSIS_RPC_URL=https://your-archive-rpc.example \
  npm run verify:fork -- --bundle releases/proposal-v1.0.0
```

The fork command starts Anvil itself, pins the published snapshot block, uses account impersonation, enforces chain ID 31337, and shuts Anvil down afterward. Never provide a private key.

## Build a review bundle

Copy `configs/production.example.json` to an ignored local config and replace every placeholder with the exact production Safe, owner set, threshold, and snapshot block.

```bash
GNOSIS_RPC_URL=https://your-archive-rpc.example \
  npm run export:bundle -- \
  --config proposal.config.local.json \
  --out artifacts/generated/proposal-v1.0.0

npm run verify:bundle -- --bundle artifacts/generated/proposal-v1.0.0
GNOSIS_RPC_URL=https://your-archive-rpc.example \
  npm run verify:fork -- --bundle artifacts/generated/proposal-v1.0.0
```

The exporter refuses the wrong chain, missing bytecode, Safe owner/threshold mismatch, unexpected ACL managers or grants, an already-paused Conviction contract, or a zero Common Pool balance. It emits raw and decoded scripts, script hashes, unsigned `newVote` calldata, state evidence, a fork report, and checksums.

## Release model

- `design-v1.0.0` is a non-production release using a deterministic fork-only authority.
- `proposal-v1.0.0` will contain the final production Safe and exact HNY snapshot.
- `vote-2-readiness-v1.0.0` will contain post-Vote-1 evidence and must reproduce the original Vote 2 hash.

The source/config commit and generated artifact commit are separate to avoid a circular self-reference. The bundle records the exact source commit used to construct it. Both vote contexts point to that source commit; public communication links the artifact commit and its checksums.

GitHub release assets can be replaced by a repository owner. Integrity therefore comes from the full Git commits, `checksums.txt`, byte-for-byte reconstruction, and the execution-script hashes stored by Decision Voting—not from a mutable release label.

Independent attestations are welcome through the verification issue template. They are advisory, with no required reviewer count or minimum waiting period. Exact state checks and a passing latest applicable fork remain mandatory before creating or executing either vote.

## Security boundary

- Chain ID 100 clients expose reads and unsigned calldata only.
- Fork mutation is confined to `src/fork.ts` and guarded by chain ID 31337.
- `package.json` remains private to prevent accidental npm publication.
- Corrections use a new commit/release and explicitly invalidate old artifacts.

This repository supports verification; it does not authorize either governance vote or any mainnet transaction.
