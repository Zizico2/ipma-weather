# Working in this repository

Prefix shell commands with `rtk` (use `rtk proxy` for unfiltered commands).
Use Bun and keep the lockfile checked in. Keep generated protobuf and the HTTP/2
transport on the server. Follow `proto/README.md` when regenerating the client.
Run Biome, typecheck, Vitest, Playwright, the production build, and the browser
bundle check before delivering changes to the data boundaries.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
