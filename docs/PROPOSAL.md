# Gardens v1 and Celeste integration deprecation plan

Status: approved two-vote execution shape, verified on a fresh local Gnosis fork on 2026-08-04. This document is an operator proposal, not authorization to create or execute a Gnosis mainnet vote.

## Goal

Deprecate Gardens v1 and its Celeste integration by:

- stopping Conviction Voting and Dynamic Issuance;
- transferring the Common Pool's exact remaining HNY balance to a replacement Safe;
- removing public v1 proposal, vote, and challenge entrypoints;
- transferring recovery and decision-making authority from Decision Voting to the Safe; and
- leaving the shared Celeste Court itself unchanged and operational.

The transition uses two Decision votes. Vote 1 performs the operational shutdown while deliberately preserving Decision Voting. Vote 2 retires Decision Voting and transfers all reviewed ACL permission managers to the Safe.

## Why two votes

The complete target state requires 91 Aragon CallScript actions. A fresh-fork rehearsal proved that every action is valid, but the single-vote execution used `21,293,786` gas and cannot fit the normal Gnosis block-gas limit of approximately 17 million.

The approved split was then executed through two complete Decision vote lifecycles on a separate fresh fork with its normal `17,000,000` block-gas limit:

| Vote | Purpose | Actions | Estimated gas | Gas used | Result |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Operational shutdown | 35 | `2,125,598` | `1,991,075` | Executed |
| 2 | Authority transfer | 56 | `4,337,615` | `4,152,006` | Executed |

The rehearsal created Vote 2 only after Vote 1 had executed. This confirms the key sequencing property: Vote 1 leaves public Decision vote creation, the Agreement-to-Decision link, Decision Voting's administrative grants, and all 33 permission managers intact long enough to create, pass, and execute Vote 2.

The raw 91-action builder remains in code only as a target-state comparison. It must not be used for a production vote.

### Why the split uses less total gas

The two execution receipts total `6,143,081` gas, but that does not imply the 91 actions can fit in one transaction. Gas use in the legacy Aragon CallScript executor is not linear in the number of actions.

The combined execution script is 11,224 bytes. An opcode trace of the successful 50 million gas-limit rehearsal showed the legacy Solidity 0.4.24 execution path repeatedly copying the dynamic script while walking its actions. EVM memory reached approximately 3.1 MB, and `CALLDATACOPY` plus its memory-expansion charges accounted for approximately `18,645,965` gas. The EVM's memory-expansion cost grows as memory expands, so keeping all 91 actions in one script creates a large superlinear penalty.

The split scripts are 4,280 bytes and 6,948 bytes. Each vote executes in a new transaction with fresh EVM memory, avoiding most of that expansion penalty. This is why the split costs less in total rather than merely dividing the original `21,293,786` gas between two blocks.

This behavior was reproduced with the current builders on fresh forks:

- the exact combined script reverted during estimation under the normal block-gas limit;
- the same combined script used `21,293,786` gas when given a 50 million block limit; and
- the two scripts executed under the normal limit using `1,991,075` and `4,152,006` gas.

## Locked decisions

- Use a real Safe as the production replacement authority. The fork rehearsal uses a deterministic Anvil EOA only as a stand-in.
- Transfer an exact HNY snapshot from the Common Pool. If its balance changes before Vote 1 execution, abandon that vote and build a new one; do not add dynamic sweep logic.
- Revoke Dynamic Issuance's HNY `MINT_ROLE` and `BURN_ROLE`. Do not grant those roles to the Safe.
- Give the Safe direct permission for the 20 roles currently held by Decision Voting, plus Conviction Voting pause and Common Pool transfer recovery permissions.
- Move all 33 ACL permission-manager slots currently managed by Decision Voting to the Safe in Vote 2.
- Pause Conviction Voting and revoke public Conviction proposal/challenge access in Vote 1.
- Revoke public Decision vote/challenge access only in Vote 2, after it is no longer needed to perform the transition.
- Preserve the seven unrelated integration grants identified below.
- Report active Conviction proposals, Decision votes, and Agreement/Celeste cases during preflight, but do not add contingency logic for hypothetical late legitimate activity. Operators accept the short inter-vote risk because legitimate new v1 activity is not expected.

## Verified deployment state

These observations were collected from Gnosis Chain on 2026-08-04 and must be re-read immediately before constructing production votes.

| Component | Address | Observed state |
| --- | --- | --- |
| DAO Kernel | `0x8ccbeab14b5ac4a431fffc39f4bec4089020a155` | v1 Kernel |
| ACL | `0xbc4fb635636b81e60a4e356c4dceb53cac507d03` | 33 relevant manager slots point to Decision Voting |
| Decision Voting | `0xfbd0b2726070a9d6aff6d7216c9e9340eae68b2a` | 21 historical votes; all closed and non-executable at observation time |
| Conviction Voting | `0x0b21081c6f8b1990f53fc76279cc41ba22d7afe2` | Not paused; no active proposals observed |
| Common Pool Agent | `0x4ba7362f9189572cbb1216819a45aba0d0b2d1cb` | `21,398.659784944634936554` HNY; zero xDAI/WXDAI observed |
| HNY Token Manager | `0xed062e26c8f41a9088d060156edc7fc6c17d5825` | Dynamic Issuance holds mint and burn permissions |
| Dynamic Issuance | `0x783da66eea5a93f46f386806fce49ce18937f861` | Active; settings role managed by Decision Voting |
| Agreement | `0x59a15718992a42082ab2306bc6cbd662958a178c` | Gardens v1 integration to remove |
| Celeste Court | `0x44e4fcfed14e1285c9e0f6eae77d5fdd0f196f85` | Shared infrastructure; out of scope for mutation |

The observed Common Pool amount is evidence, not the production transfer amount. Vote 1 must use a fresh, exact `balanceOf(Common Pool)` result.

## Permission transition

The reviewed ACL state contains 37 active grants across the 33 manager slots:

- 20 Decision Voting administrative grants become direct Safe grants in Vote 1 and are revoked in Vote 2.
- 4 `ANY_ENTITY` grants enable public creation/challenge actions: the two Conviction grants are revoked in Vote 1; the two Decision grants are revoked in Vote 2.
- 2 Agreement-to-v1 `SET_AGREEMENT_ROLE` links are removed: Conviction in Vote 1 and Decision in Vote 2.
- 1 Conviction Voting Common Pool transfer grant and 1 legacy Conviction pauser grant are revoked in Vote 1.
- 2 Dynamic Issuance mint/burn grants are revoked in Vote 1.
- 7 unrelated grants are preserved: two Superfluid Common Pool permissions, two Agreement settings-admin permissions, two Superfluid helper permissions, and one BrightID settings-admin permission.

The Safe receives 22 direct permissions in Vote 1: the 20 currently held by Decision Voting, Conviction Voting pause, and Common Pool transfer. It becomes manager of all 33 reviewed slots in Vote 2. It does **not** receive HNY mint or burn permission.

The exact role, grantee, manager, and phase manifests are encoded in `src/manifest.ts` and asserted by unit and fork tests. Production preparation must compare those manifests with current ACL reads before either vote is created or executed.

## Vote 1: operational shutdown

Vote 1 has 35 actions in this order:

1. Temporarily grant Decision Voting the Conviction Voting pause role.
2. Pause Conviction Voting.
3. Temporarily grant Decision Voting the Common Pool transfer role.
4. Transfer the exact snapshotted HNY balance from the Common Pool to the Safe.
5. Grant the Safe its 22 direct recovery and administrative permissions.
6. Revoke 9 shutdown grants:
   - the 2 temporary grants;
   - public Conviction proposal creation and challenge;
   - the Agreement-to-Conviction link;
   - Conviction Voting's Common Pool transfer grant;
   - the legacy Conviction pauser grant; and
   - Dynamic Issuance mint and burn.

Vote 1 deliberately does **not** change any permission manager or revoke any Decision Voting permission, public Decision entrypoint, or Agreement-to-Decision link.

Required Vote 1 postconditions:

- Common Pool HNY is zero and the Safe balance increased by the exact snapshot.
- Conviction Voting is paused, while withdrawals remain callable so existing stakers are not trapped.
- Dynamic Issuance no longer has HNY mint or burn permission, and the Safe has neither permission.
- The Safe has all 22 intended direct permissions.
- All 9 shutdown grants are absent and all 7 preserved grants remain present.
- All 23 grants reserved for Vote 2 remain present.
- All 33 reviewed permission managers still equal Decision Voting.

## Inter-vote state

After Vote 1, Gardens v1 Conviction activity and Dynamic Issuance are shut down, the Common Pool has been emptied into the Safe, and the Safe has direct recovery permissions. Decision Voting is intentionally still operational and remains manager of all 33 reviewed roles so it can carry out Vote 2.

Create and execute Vote 2 promptly after verifying Vote 1's postconditions. During this interval, Decision Voting can still exercise or alter its existing authority and public users can still create or challenge Decision votes. The approved plan accepts this bounded exposure and does not add extra contingency machinery. Any observed ACL, grant, bytecode, or unexpected governance drift is nevertheless a hard stop: do not execute Vote 2 until a fresh fork rehearsal confirms the actual state.

## Vote 2: governance retirement

Vote 2 has 56 actions in this order:

1. Revoke 23 Decision-side grants:
   - Decision Voting's 20 administrative permissions;
   - public Decision vote creation and challenge; and
   - the Agreement-to-Decision link.
2. Transfer all 33 reviewed permission-manager slots to the Safe, with `ACL.CREATE_PERMISSIONS_ROLE` transferred last.

Transferring `ACL.CREATE_PERMISSIONS_ROLE` last ensures Decision Voting remains able to complete every preceding ACL action in the script.

Required Vote 2 postconditions:

- All 33 reviewed permission managers equal the Safe.
- The Safe still has all 22 intended direct permissions and has no HNY mint or burn permission.
- All 32 grants revoked across both votes are absent.
- All 7 preserved integration grants remain present.
- A new Decision vote can no longer be created.
- Celeste Court bytecode is unchanged and neither CallScript targets a Celeste contract.

## Production preflight

Do not create Vote 1 until every check below has an auditable result.

1. Confirm the destination is the intended Safe, with deployed bytecode, correct chain, expected owners, threshold, and a tested transaction path.
2. Re-read the Common Pool HNY balance and build Vote 1 using that exact integer amount.
3. Confirm all 33 permission managers still equal Decision Voting.
4. Confirm every expected grant and every preserved integration grant matches the manifest. Treat drift as a hard stop requiring review and rebuilt scripts.
5. Confirm Dynamic Issuance currently holds HNY mint and burn permissions; confirm the Safe does not.
6. Report active Conviction proposals, open/executable Decision votes, Agreement actions, and Celeste disputes.
7. Decode both scripts and confirm Vote 1 has exactly 35 actions and Vote 2 has exactly 56, with the reviewed phase assignment and ordering.
8. Fork the latest Gnosis block and execute the complete two-vote lifecycle using the proposed Safe and exact HNY snapshot. Require every intermediate and final assertion to pass under the normal block-gas limit.
9. Record execution-gas estimates with adequate block-gas headroom for both votes.
10. Obtain independent human review of the Safe address, HNY amount, decoded scripts, phase boundary, and fork result.

## Public communication and independent verification

The proposal should be communicated as one canonical review package with two clearly labeled votes. The public should not have to trust a screenshot, UI label, transaction-builder website, or the proposal author's interpretation of raw calldata.

Use three layers:

1. **Human summary:** a short explanation of the outcome, the two phases, the exact assets and authority affected, the inter-vote risk, and why a single vote cannot fit.
2. **Commit-addressed verification bundle:** complete raw and decoded data tied to one full source commit and one chain snapshot in the public [`gardens-v1-deprecation`](https://github.com/lkngtn/gardens-v1-deprecation) verifier repository.
3. **Independent attestations:** reviewers publish the exact hashes and values they reproduced, not only a general statement that the proposal looks correct.

Publish the canonical long-form proposal in one stable location. Mirror only a short summary and a link in chat or social channels so corrections do not fragment across multiple mutable copies. Both on-chain Decision vote contexts should link to the full verifier source commit and identify their phase as `1 of 2` or `2 of 2`; the public announcement should additionally link the full artifact commit.

### What can be verified now

Before the production Safe and final HNY snapshot are selected, reviewers can already verify:

- the intended 35/56 action partition and all role/grantee/manager constants in the source manifest;
- that Vote 1 preserves everything required to create and execute Vote 2;
- that neither script targets Celeste Court;
- the unit tests and full two-vote fork lifecycle using the deterministic fork-only authority;
- the measured normal-limit gas use and the combined-script gas failure; and
- the intermediate and final postconditions encoded in the fork test.

These checks validate the design, not the final production calldata. A request to vote should not be published until the remaining values below are fixed and independently reproducible.

### Required verification bundle before Vote 1 is created

Publish a directory committed at a full Git commit SHA containing at least:

| Artifact | Required contents |
| --- | --- |
| `README.md` | Plain-language purpose, two-phase timeline, risks, review deadline, and links to every artifact |
| `snapshot.json` | Chain ID, block number, block hash, timestamp, source commit, contract addresses and bytecode hashes, ACL managers/grants, active governance report, and exact Common Pool HNY balance |
| `authority.json` | Production Safe address, bytecode hash, owners, threshold, chain, and the method used to verify each field |
| `vote-1-manifest.json` | Ordered 35-action list with index, label, target, selector, full calldata, and decoded arguments |
| `vote-1-script.hex` | Exact raw CallScript bytes supplied to `newVote` and later `executeVote` |
| `vote-1-preview.json` | Unsigned `newVote` transaction target, value, calldata, execution-script Keccak-256 hash, simulation result, and gas estimate |
| `vote-2-manifest.json` | Ordered 56-action list with index, label, target, selector, full calldata, and decoded arguments |
| `vote-2-script.hex` | Exact proposed Vote 2 CallScript bytes |
| `vote-2-preview.json` | Unsigned proposed `newVote` transaction data, execution-script hash, simulation result, and gas estimate |
| `fork-report.md` | Fork block, commands, tool versions, transaction receipts, gas used, and every intermediate/final assertion |
| `checksums.txt` | SHA-256 checksums for every other file in the bundle; the Git commit covers `checksums.txt` itself |

The bundle must contain concrete values—never `TBD`, example addresses, rounded token amounts, or truncated calldata. The exact HNY amount should appear in both wei and human-readable 18-decimal form. The production Safe address should appear in checksummed and lowercase form to make visual and byte-for-byte comparison easy.

The repository exposes a one-command read-only exporter through `npm run export:bundle`. It accepts a reviewed config containing the Safe and snapshot block, re-reads required state, writes the artifacts above, and exits without signing or submitting anything. Production use still requires independent source review, bundle reconstruction, and a complete fork rehearsal.

The Decision contract commits to `keccak256(executionScript)`. Publish that hash prominently for each vote. File checksums protect the surrounding review bundle; the execution-script Keccak-256 hash is the value reviewers must compare to the on-chain vote.

Vote 2 can be drafted and reviewed before Vote 1, because it depends only on the selected Safe and fixed manifest. After Vote 1 executes, regenerate its live-state report and simulation. If the proposed Vote 2 script bytes or hash change for any reason, restart the Vote 2 review rather than treating it as the previously reviewed proposal.

### Independent verification procedure

An independent reviewer should be able to perform all of the following without relying on an operator's local output:

1. Check out the exact published source commit and run `npm ci` followed by `npm run check`.
2. Re-read chain ID 100 at the published snapshot block and compare contract bytecode hashes, the Common Pool balance, ACL grants, and all 33 managers with `snapshot.json`.
3. Verify the Safe bytecode, owners, and threshold directly from Gnosis Chain and compare them with `authority.json`.
4. Rebuild both CallScripts from the source manifest, Safe address, and exact HNY amount.
5. Compare every decoded action, the complete raw bytes, and `keccak256(executionScript)` with the published artifacts.
6. Reconstruct the unsigned `newVote` calldata and compare it byte-for-byte with each published preview.
7. Execute the complete two-vote lifecycle on a fresh normal-limit fork and compare receipts, gas use, intermediate state, and final state with `fork-report.md`.
8. After each vote is created, retrieve its on-chain `StartVote` event and stored execution-script hash. Confirm they match the reviewed script before casting a vote.
9. Immediately before each execution, repeat the live-state and exact-script simulation checks from this runbook.

Independent byte-for-byte reconstruction is strongly encouraged. Reviewers should ideally use different RPC providers, and at least one reviewer should use an independently written decoder or direct RPC reads rather than only the repository's helper functions. External attestations are advisory rather than a gate to vote creation; the automated, fork, and live-state production gates remain mandatory.

### Reviewer attestation format

Ask reviewers to publish a compact, comparable statement:

```text
I independently verified the Gardens v1 deprecation proposal.
Source commit: <40-character commit>
Snapshot block/hash: <number> / <hash>
Replacement Safe: <address>
Safe owners/threshold verified: yes/no
Common Pool HNY snapshot: <wei> (<decimal HNY>)
Vote 1 actions / script hash: 35 / <keccak256>
Vote 2 actions / script hash: 56 / <keccak256>
Fresh normal-limit fork: pass/fail
Vote 1 gas estimate: <gas>
Vote 2 gas estimate: <gas>
Exceptions or concerns: <none or exact details>
Reviewer: <name or address>
Review date: <ISO-8601 timestamp>
```

An attestation with missing hashes or only “looks good” is useful social feedback, but it is not independent technical verification.

### Suggested public announcement

The initial announcement should lead with the outcome and the review request:

```text
Proposal for review: deprecate Gardens v1 and its Celeste integration through two Decision votes.

Vote 1 pauses Conviction Voting, disables Dynamic Issuance mint/burn, transfers the Common Pool's exact HNY balance to <SAFE>, grants the Safe 22 recovery/admin permissions, and removes the Conviction-side public and Agreement permissions.

Vote 2 removes Decision Voting's remaining authority and public/Agreement entrypoints, then transfers all 33 reviewed ACL permission managers to <SAFE>.

The shared Celeste Court is not modified. Conviction withdrawals remain available after Vote 1. Decision Voting intentionally remains active between votes so it can execute Vote 2.

Please independently verify the Safe, exact HNY amount, decoded actions, raw scripts, and script hashes before voting. Canonical review bundle commit: <FULL GITHUB COMMIT URL>
Source commit: <COMMIT>
Snapshot block/hash: <BLOCK> / <HASH>
Vote 1 script hash: <HASH>
Vote 2 script hash: <HASH>
```

Replace every placeholder before publication. There is no mandatory review interval or attestation count, but operators should allow as much review time as the execution schedule reasonably permits. Publish any correction at a new full commit, issue a replacement release, and explicitly invalidate the previous bundle.

## Execution procedure

### Vote 1

1. Build the unsigned Decision `newVote` preview from the reviewed 35-action shutdown script and publish its decoded manifest, script hash, and exact HNY snapshot.
2. Submit vote creation through a separately reviewed confirmation-gated transaction path; this verifier cannot submit it.
3. Vote through the normal Decision process and wait for the voting and execution-delay periods.
4. Immediately before execution, re-read the Common Pool HNY balance, expected grants, and all 33 managers. The balance must equal the script snapshot and all managers must still be Decision Voting.
5. Recompute the script hash and simulate the exact execution transaction at the current block. On any mismatch or revert, do not execute; abandon and rebuild Vote 1.
6. Execute through that external confirmation-gated path, retain the receipt and decoded events, and verify every Vote 1 postcondition.

### Vote 2

1. Only after Vote 1 passes all postconditions, build and publish the unsigned `newVote` preview for the reviewed 56-action authority-transfer script.
2. Create and pass Vote 2 through the normal Decision process.
3. Immediately before execution, repeat the complete ACL/grant/manager checks. In particular, all 22 Safe direct grants and all 23 Decision-side grants must still be present, and all managers must still equal Decision Voting.
4. Recompute the script hash and simulate the exact execution transaction at the current block. Any drift or revert is a hard stop requiring diagnosis and a fresh fork rehearsal.
5. Execute through that external confirmation-gated path, retain the receipt and decoded events, and verify every final postcondition before declaring deprecation complete.

## Failure and recovery

- Before Vote 1 execution: a changed HNY balance, ACL drift, Safe mismatch, bytecode mismatch, simulation failure, or script-hash mismatch means **do not execute**. Produce a new snapshot and Vote 1.
- After Vote 1 but before Vote 2: Conviction and issuance remain shut down, while Decision Voting remains the recovery path. Diagnose any drift on a fresh fork. Rebuild the next action rather than executing a stale Vote 2.
- During either execution: Aragon CallScript execution is atomic within that vote. Any failed action reverts that entire phase. Verify the vote remains executable before retrying and reproduce the exact revert on a fork first.
- After Vote 2: the Safe is the recovery authority. Use Safe governance to correct an omitted grant or manager only after comparing live state with the reviewed manifest. Restoring issuance would require a separate, explicit governance action because the Safe intentionally lacks mint/burn permission.

## Fork rehearsal

Run the opt-in rehearsal against a fresh local fork with the normal block-gas limit:

```bash
npm ci
npm run verify:bundle -- --bundle <bundle-directory>
GNOSIS_RPC_URL=https://your-archive-rpc.example \
  npm run verify:fork -- --bundle <bundle-directory>
```

The verifier starts a pinned local Anvil fork, uses account impersonation, refuses mutation unless the chain ID is 31337, and never accepts a private key. Its test actor is `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`, a deterministic fork-only address. Passing with that actor proves the two-vote treasury and ACL mechanics; it does not satisfy production Safe bytecode, ownership, or threshold gates.

The test funds and signs a fork voter, stakes to an existing Conviction proposal, executes Vote 1, verifies its intermediate state, proves a paused Conviction withdrawal still works, creates and executes Vote 2, and verifies final retirement and unchanged Celeste bytecode. No test submits a Gnosis mainnet transaction.

## Remaining production gates

- Select and independently verify the production Safe address, owner set, threshold, and transaction path.
- Refresh all live-state evidence and the exact HNY snapshot when Vote 1 is constructed.
- Publish the complete commit-addressed verification bundle before Vote 1 creation.
- Invite independent attestations covering the Safe, exact HNY amount, both decoded CallScripts, and both execution-script hashes; they are advisory rather than a production gate.
- Pass a latest-block normal-limit fork rehearsal with the production Safe address and exact proposed scripts.
- After each on-chain vote is created, match its event and stored script hash to the reviewed bundle before voting.
- Explicitly authorize mainnet creation and execution for each vote as separate operator actions.
