# Fork report

Status: pass

- Fork chain: 31337
- Gnosis source block: 47606645 / 0x5186613522dda0bb356cffa5775fca326c5d0e7a1034e9795f28c06c9b058c35
- Anvil gas limit: 17000000
- Fork actor: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (impersonated; no private key accepted)
- Vote 1 ID: 21
- Vote 1 gas used: 1979428
- Vote 2 ID: 22
- Vote 2 gas used: 4152006
- Common Pool snapshot: 21398659784944634936554 wei (21398.659784944634936554 HNY)
- Vote 1 script hash: 0x11453d7a44853c267fcf7f8a799f17bbf8663d3cff5823084211e47351b9110e
- Vote 2 script hash: 0xff63da987c4795aaf0175e5e15aa293cd08e8213c3782510815b30109f8c064f
- Intermediate and final ACL assertions: pass
- Conviction withdrawal after pause: pass
- Celeste Court bytecode unchanged: pass

The harness temporarily impersonates fork accounts and restores the exact Common Pool balance before Vote 1 execution. It refuses mutation unless the local chain ID is 31337.
