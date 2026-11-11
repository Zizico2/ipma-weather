# Tempo · IPMA weather

A small weather app for Portugal, in its own repository. Search IPMA locations,
explore the five-day forecast, select a day, switch °C/°F, and refresh. Missing
measurements stay missing; daily maximums are labelled as forecasts, not current
observations. All weather data comes from the backend.

## Run

Requires Node.js 24+ and Bun 1.4.4. Start `ipma-proxy` on port 50051 first (run
`cargo run --locked` in that repository), then:

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun dev
```

Open http://127.0.0.1:3000. `IPMA_GRPC_URL` is a **server-only** environment
variable. Its default is `http://127.0.0.1:50051`; set it to
`http://127.0.0.1:50052` to use the caching gateway. HTTPS endpoints use the
transport's normal certificate verification. There are no browser gRPC or CORS
requirements. Do not prefix this variable with `NEXT_PUBLIC_`.

`bun run build && bun start` runs the production app. The build contacts the
backend to prerender Lisbon; keep the backend available during the build.
Other cities stream into the shared static shell at request time.

The root layout includes the cached location picker, so it is searchable before
a city's forecast arrives and its search text survives city navigation. The
location catalogue crosses the RSC boundary as plain props; the forecast uses
TanStack DB's native dehydration and hydration. Active-link styling is isolated
behind its own Suspense boundary so reading the current URL does not delay the
picker. The forecast remains one streaming section, since its metrics come
from the same RPC.

City links prefetch the shared shell by default. Hovering or focusing a link
opts that link into `prefetch={true}`, including its cached city forecast.
Leaving the link restores the default shell-only prefetch policy. A cold
forecast cache can still take time to fill before navigation.

## Stack and boundaries

| Layer        | Implementation                                                                        |
| ------------ | ------------------------------------------------------------------------------------- |
| Framework    | Next.js **16.4.6**, React **19.3.1**, App Router and RSC                              |
| Compiler     | React Compiler enabled; default Turbopack for dev and build                           |
| Next caching | Cache Components, Partial Prefetching, `use cache`, `cacheLife`, `cacheTag`           |
| Styling      | StyleX **0.19.1**, compiled with the SWC community integration and PostCSS extraction |
| Components   | Astryx **0.7.13**, prebuilt component CSS, neutral theme, Button and TextInput        |
| Server API   | Hono in a Next route handler, Node runtime                                            |
| Backend      | Generated Protobuf-ES descriptors + Connect's native HTTP/2 gRPC transport            |
| Client data  | TanStack DB **1.0.0-rc.1.4**, Query collection adapter, live queries                  |
| Tools        | Bun lockfile, Biome, TypeScript, Vitest, Playwright                                   |

```text
Server Component → cached backend loaders → generated gRPC client → ipma-proxy
       ↓ DB preload / dehydrate                                 (or gateway)
Client Component → DbProvider / HydrationBoundary → live queries
       ↓ collection sync / refresh
Hono /api → same cached backend loaders → gRPC
```

Server Components call shared loaders directly, avoiding an HTTP request to
their own Hono endpoint. Browser collection queries use `/api/locations` and
`/api/forecasts/:locationId`. The API validates IDs and returns 400, 404 or a
sanitized 503 as appropriate.

The server allocates a fresh `DbClient` and `QueryClient` for each snapshot
computation, preloads the ordered forecast live query, dehydrates its result
without serializing its source collection, and cleans up both clients.
The serialized snapshot is cached with the forecast; this also
contains the timestamps DB records internally within a valid cache boundary.
The browser hydrates one app-scoped client, preserving live-query state when
Next's Activity hides a city view and restores it on browser Back/Forward.
Completed city visits are also reused on link navigation for five minutes via
`experimental.staleTimes.dynamic`. Next otherwise defaults request-rendered
pages to zero seconds, even when their backend data is cached. Prefetched
forecast entries retain their existing one-minute `cacheLife.stale` window.
No process-wide collection state is shared between server renders.

All protobuf code lives under `src/server/gen`. Only plain, validated weather
DTOs cross the RSC boundary. `server-only` protects the gRPC entry point;
`bun run check:client` checks production browser assets for the gRPC runtime
and schema markers.

Forecasts revalidate after 5 minutes and expire after 30 minutes. Next can serve
stale data while revalidating; a refresh reads this shared cache, rather than
forcing a new IPMA request. Locations revalidate daily and descriptions use the
`days` profile. Source-update and retrieval timestamps are displayed separately.
Tags identify each city forecast and the location catalogue for future
invalidation. No public cache invalidation endpoint is exposed.

On Workers, `experimental.disableResumeDataCacheCompression` avoids a workerd
`RangeError` when Next restores a compressed Resume Data Cache using
`inflateSync` with an unsupported output limit. Without it, a successful static
shell can leave the forecast stuck on “Looking at the skies.” Build and deploy
together so the persisted resume state and runtime use the same format.

The pinned Cloudflare adapter also carries the scheduler and request-isolation
patches documented in
[patches/README.md](patches/README.md). It prevents incomplete runtime prefetches
and stalled navigation streams on workerd while preserving Cache Components and
intent prefetching. Bun applies it automatically during a frozen-lockfile install.

All requested framework features remain enabled. The two deliberate dependency
choices are TanStack DB's current RC for native SSR support, and the community
StyleX SWC integration to retain the native Next compiler pipeline. Astryx is
currently beta. The experimental Next options above handle Workers resume
compatibility and completed-visit reuse.

## Generate the client

The complete schema snapshot is vendored from a pinned `ipma-proto` commit;
see [proto/README.md](proto/README.md). Generated TypeScript is checked in.
Neither installation nor code generation needs a sibling checkout or a system
`protoc` installation.

```sh
bun run proto:generate
```

Buf invokes the pinned local Protobuf-ES generator. Update the schema snapshot
and its provenance together when adopting a newer backend contract. Generated
types use `.ts` import extensions, enabled in `tsconfig.json`.

## UI and theme

Build with [Astryx components](https://astryx.atmeta.com/components) and its
[documentation](https://astryx.atmeta.com/docs/). The app shell and mobile
navigation use AppShell, TopNav, and SideNav. Layout, Stack, Grid, and Section
own composition; forecast days use RadioList inside Carousel. Typography,
metadata, loading, errors, and empty states also use Astryx.

Tempo's editable theme is `src/themes/tempo/tempoTheme.ts`. It extends Neutral
with warm paper surfaces, sage accents, typography, and forecast card variants.
Use component `xstyle` props for local artwork and styling. Change shared styles
in the theme, then regenerate and commit its production CSS/JS/types:

```sh
bun run theme:build
bun run theme:check
bun run astryx:doctor
```

The app imports the built theme so SSR includes its styles on the first paint.
Generated outputs live in `src/themes/tempo/generated/`; edit the source rather
than those files. Look up the installed API with `bun run astryx component
<Name>` and `bun run astryx docs author-a-theme`.

## Verify

```sh
bun run lint
bun run typecheck
bun run test
bunx playwright install chromium
bun run test:e2e
bun run test:e2e:production
bun run build
bun run check:client
```

`bun run test:e2e:worker` additionally builds the Cloudflare bundle and runs
desktop/mobile Chromium and desktop Firefox against Wrangler on **8788**
(install them with `bunx playwright install chromium firefox`). It exercises the actual
Workers runtime, including initial forecast streaming and revisiting cities
after a minute with forecast/page requests blocked. These integration tests use
the gateway configured in `wrangler.toml`; the build also needs a reachable
backend (`IPMA_GRPC_URL`, as with `build:cf`). They are separate from the
self-contained gRPC fixture suite below.

Set `WORKER_TEST_URL` when running `bunx playwright test --config
playwright.worker.config.ts` to target an already-deployed Worker instead of
starting Wrangler. This is important for cache-fill isolation failures that
can reproduce remotely while the same local workload passes.

Vitest covers protobuf-to-DTO mapping, zero and absent values, civil dates,
weather codes, API validation/errors, and DB hydration/request isolation.
Playwright runs desktop and mobile Chromium against an actual generated-schema
HTTP/2 gRPC fixture. It covers streamed server HTML with JS disabled, hydration,
city navigation, units, day selection, refresh failure with retained data,
empty/missing data, backend failure, and unknown locations. With JS disabled,
late Suspense HTML is present but React's reveal script cannot run.

Navigation tests use Next's `instant()` helper to hold back request-time data
and verify that the picker remains interactive and preserves its search.
The production suite also verifies that hover and keyboard focus receive a
city's forecast before clicking, then render it while navigation is paused.
These prefetch tests are skipped in `next dev`, where prefetching is disabled.
Only the production test build enables `EXPOSE_TESTING_API=1`; normal builds
keep Next's testing API disabled.

E2E runs its own gRPC server on **50061** and Next on **3001**, with a separate
`.next-e2e` build directory. The fixture is test-only; the app never falls back
to sample data. No live IPMA service or Rust build is required for the tests.

## References

- [Next Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)
- [TanStack DB SSR and hydration](https://tanstack.com/db/latest/docs/guides/ssr)
- [Connect Node gRPC clients](https://connectrpc.com/docs/node/using-clients/)
- [StyleX SWC integration](https://github.com/Dwlad90/stylex-swc-plugin)
- [Astryx](https://github.com/meta/astryx)
