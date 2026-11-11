# Cloudflare Cache Components compatibility patches

`@opennextjs/cloudflare@1.20.16` is patched with the scheduler and build wiring
from [OpenNext PR #1318](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318),
pinned to commit `9dbb20965a8506c64bb91a9e5bf7e4c19574262c`.
The upstream TypeScript files are transpiled to the package's distributed JS;
the version and application dependencies otherwise stay unchanged.

Next finds render-stage boundaries using Node's `process.nextTick` semantics.
workerd implements that queue differently, so a stage can end before React
flushes its work. A prefetch can return HTTP 200 with loading placeholders and
missing forecast data; navigation can keep its stream open indefinitely.

The backport loads the scheduler before Next, drains scheduled immediates
between stages, and scopes the bookkeeping to each request. Its build hook
fails if it cannot recognize the expected runner. The module-loading signal
fix discussed in the PR is already present in the pinned adapter.

The patch also applies the workaround from
[OpenNext issue #1464](https://github.com/opennextjs/opennextjs-cloudflare/issues/1464):
disable Next 16.4's cross-request deduplication of pending `use cache` fills
inside the Worker bundle. Otherwise a later request can wait indefinitely on
a KV write owned by an earlier, finished request. This problem can persist
after the scheduler fix and has been reported only on deployed Workers.

The build hook matches both the source cache wrapper and Turbopack's compiled
wrapper, and fails if no matching flag is found. Cache Components, PPR,
intra-request deduplication and the persistent KV cache remain enabled. Cold
concurrent requests can generate duplicate fills instead of sharing one
request's pending I/O. Node builds are unaffected.

`bun install --frozen-lockfile` applies the checked-in Bun patch. Remove it
when upgrading to an adapter release containing both fixes, and run
`bun run test:e2e:worker` against the replacement. The regression suite
checks completed forecast payloads as well as browser navigation: an HTTP 200
and a closed stream alone do not prove a prefetch is usable.
