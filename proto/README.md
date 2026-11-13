# Schema snapshot

Vendored from https://github.com/Zizico2/ipma-proto at
`2d60bcd87d47db2662b486be3a998638b9f27141` (the `proto/ipma` directory).
The schema source of truth remains ipma-proto. No sibling checkout is required
to build or regenerate this app. Generated TypeScript lives in `src/server/gen`
and is checked in. Run `bun run proto:generate` after updating this snapshot.

The independent website-feed schema `ipma/public_data` is vendored from
https://github.com/Zizico2/ipma-public-data-proto at
`cabad92076b69be09eedb164c3776035f5463934`. Generate both snapshots with the same
command. Website-feed bindings also stay server-only.
