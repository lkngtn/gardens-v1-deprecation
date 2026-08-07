# Gardens v1 deprecation review bundle

This bundle is unsigned verification evidence. It cannot sign or submit a transaction.

## Snapshot

- Source commit: `166c605e4451524f54668904e524e8a7067753f8`
- Gnosis block: `47606645` / `0x5186613522dda0bb356cffa5775fca326c5d0e7a1034e9795f28c06c9b058c35`
- Replacement authority: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (design-eoa)
- Common Pool HNY: `21398659784944634936554` wei (21398.659784944634936554 HNY)
- Active Decision votes: 0
- Readable active Conviction proposals: 0
- Conviction proposal IDs that reverted during direct reads: 35, 36, 43, 44, 62, 68, 80, 85, 86, 89, 116, 117, 136, 185

## Vote 1

- Purpose: operational shutdown, issuance removal, and Common Pool transfer
- Actions: 35
- Execution-script hash: `0x11453d7a44853c267fcf7f8a799f17bbf8663d3cff5823084211e47351b9110e`

## Vote 2

- Purpose: retire Decision Voting and transfer reviewed permission managers
- Actions: 56
- Execution-script hash: `0xff63da987c4795aaf0175e5e15aa293cd08e8213c3782510815b30109f8c064f`

The shared Celeste Court is not targeted. External review is encouraged but advisory; live-state, exact-hash, and fork checks remain mandatory.

An unreadable Conviction proposal is reported rather than silently classified. Historical proposals can revert because the legacy SlidingWindowOracle lacks an observation; operators must cross-check every reported ID before production.

Run `npm run verify:bundle -- --bundle <directory>` and `GNOSIS_RPC_URL=... npm run verify:fork -- --bundle <directory>` from the source commit above.
