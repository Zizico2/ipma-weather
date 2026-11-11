# Tempo · IPMA weather

A small weather app for Portugal, in its own repository. Search IPMA locations,
explore the five-day forecast, select a day, switch °C/°F, save places, and refresh. Missing
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
computation, preloads descriptor-backed collections, dehydrates them, and cleans
up both clients. The serialized snapshot is cached with the forecast; this also
contains the timestamps DB records internally within a valid cache boundary.
The browser hydrates a separate client per mounted city view. No process-wide
collection state is shared between server renders.

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

### Optimistic saved places

Weather is read-only. The sample's writes are personal saved places, stored by
Hono in SQLite (`.data/weather.sqlite`, configurable with `IPMA_PREFERENCES_DB`).
Use a persistent writable volume when hosting this app. A random HttpOnly,
SameSite browser cookie scopes each visitor's list; it is not an account or
cross-device sync. Personal endpoints use `private, no-store`, with Hono CSRF
checks on mutations. Preferences never enter the public weather cache.

`savedPlacesCollection` uses TanStack DB `onInsert` and `onDelete` handlers.
Calling `collection.insert()` or `.delete()` changes live-query results
immediately. The handler writes through Hono and applies confirmed server data
with `writeInsert` / `writeDelete` before settling. Rejected writes trigger
TanStack DB's automatic rollback and a visible message. The UI awaits
`transaction.when('settled')` for acknowledgement and blocks overlapping clicks
on the same place; it keeps no separate React copy of the saved list. Day and
unit selection remain immediate local view state.

All requested framework features remain enabled. The two deliberate dependency
choices are TanStack DB's current RC for native SSR support, and the community
StyleX SWC integration to retain the native Next compiler pipeline. Astryx is
currently beta. No experimental Next flags are needed.

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

## Verify

```sh
bun run lint
bun run typecheck
bun run test
bunx playwright install chromium
bun run test:e2e
bun run build
bun run check:client
```

Vitest covers protobuf-to-DTO mapping, zero and absent values, civil dates,
weather codes, API validation/errors, and DB hydration/request isolation.
It also verifies optimistic insert/delete rollback, SQLite persistence, visitor
isolation, private caching, and mutation validation.
Playwright runs desktop and mobile Chromium against an actual generated-schema
HTTP/2 gRPC fixture. It covers streamed server HTML with JS disabled, hydration,
city navigation, units, day selection, refresh failure with retained data,
empty/missing data, backend failure, and unknown locations. With JS disabled,
late Suspense HTML is present but React's reveal script cannot run.

Saved-place tests hold HTTP acknowledgements open to prove inserts and deletes
appear before the server responds, then verify persistence after reload and
rollback of both mutation types on 503 responses.

E2E runs its own gRPC server on **50061** and Next on **3001**, with a separate
`.next-e2e` build directory. The fixture is test-only; the app never falls back
to sample data. No live IPMA service or Rust build is required for the tests.

## References

- [Next Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)
- [TanStack DB SSR and hydration](https://tanstack.com/db/latest/docs/guides/ssr)
- [Connect Node gRPC clients](https://connectrpc.com/docs/node/using-clients/)
- [StyleX SWC integration](https://github.com/Dwlad90/stylex-swc-plugin)
- [Astryx](https://github.com/meta/astryx)
