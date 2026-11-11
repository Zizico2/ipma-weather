import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// The pinned Bun patch changes these CLI internals. Exercise them against
// generated bundles so the memory regression cannot silently return.
import {
  listProjectSourceFiles,
  readBuiltPath,
} from '../../node_modules/@astryxdesign/cli/api/doctor/_adapter.mjs';

const roots: string[] = [];
const outputs = [
  '.next',
  '.next-e2e',
  '.next-preview',
  '.open-next',
  '.wrangler',
  'coverage',
  'playwright-report',
  'test-results',
];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'ipma-astryx-doctor-'));
  roots.push(root);
  const write = (file: string, contents: string) => {
    const full = join(root, file);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  };
  write(
    'src/page.tsx',
    "import { Text } from '@astryxdesign/core/Text'; export default function Page() { return <Text>Forecast</Text>; }",
  );
  for (const output of outputs)
    write(`${output}/chunks/bundle.js`, 'export const bundle = true;');
  write('node_modules/dependency/index.js', 'export const dependency = true;');
  symlinkSync(join(root, 'src'), join(root, 'linked-source'), 'dir');
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('Astryx doctor output scanning', () => {
  it('keeps application source and excludes generated bundles and links from source inspection', () => {
    const root = fixture();
    expect(
      listProjectSourceFiles(root, '').map((file: string) =>
        relative(root, file),
      ),
    ).toEqual(['src/page.tsx']);
  });

  it('still reads generated output for Astryx styles without treating it as source', () => {
    const root = fixture();
    const scan = readBuiltPath(root);
    expect(scan.truncated).toBe(false);
    expect(scan.files.find((file) => file.rel === 'src/page.tsx')?.built).toBe(
      false,
    );
    for (const output of outputs) {
      const bundle = scan.files.find(
        (file) => file.rel === `${output}/chunks/bundle.js`,
      );
      expect(bundle?.built, output).toBe(true);
      expect(bundle?.read()).toContain('export const bundle');
    }
    expect(
      scan.files.some(
        (file) =>
          file.rel.startsWith('node_modules/') ||
          file.rel.startsWith('linked-source/'),
      ),
    ).toBe(false);
  });

  it('recognizes an explicitly selected output directory and a nested chunk directory', () => {
    const root = fixture();
    for (const output of outputs) {
      for (const target of [join(root, output), join(root, output, 'chunks')]) {
        const scan = readBuiltPath(target);
        expect(scan.files).toHaveLength(1);
        expect(scan.files[0].built, target).toBe(true);
      }
    }
  });
});
