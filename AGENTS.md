# Working in this repository

Prefix shell commands with `rtk` (use `rtk proxy` for unfiltered commands).
Use Bun and keep the lockfile checked in. Keep generated protobuf and the HTTP/2
transport on the server. Follow `proto/README.md` when regenerating the client.
Run Biome, typecheck, Vitest, Playwright, the production build, and the browser
bundle check before delivering changes to the data boundaries.

## UI with Astryx

Use Astryx across the UI: https://astryx.atmeta.com/components. Design around
its available components and patterns, including layout and utilities, before
writing custom UI. Prefer AppShell/TopNav/SideNav for app chrome,
Layout/Section/Stack/Grid for composition, and the supplied typography, form,
feedback, loading, and content components. Use semantic tokens and component
props for layout and behavior. Customize the look freely with StyleX `xstyle`
and the Tempo theme in `src/themes/tempo/tempoTheme.ts`; Astryx usage does not
mean sticking to default styles. Keep shared tokens and component variants in
the theme, and use local StyleX for composition-specific styling and artwork.
After theme changes run `rtk bun run theme:build` and commit the generated
outputs; `rtk bun run theme:check` verifies they match the source.
Adapt the design when doing so makes Astryx a better fit. Custom code is fine
for domain-specific visuals or when a component's quirks would cost more than a
small implementation; do not build workarounds just to force a component in.

Inspect the installed version's API before implementing:
`rtk bun run astryx component --list`, `rtk bun run astryx component <Name>`,
`rtk bun run astryx template --list`, and `rtk bun run astryx docs`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- ASTRYX:START -->
Astryx v0.7.13 · 174 components
CLI: run every command as `bunx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then the xstyle prop / StyleX tokens. No raw hex/px.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any className=, style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or the xstyle prop + a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
