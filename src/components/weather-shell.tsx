import * as stylex from '@stylexjs/stylex';
import { ArrowUpRight, CloudSun } from 'lucide-react';
import type { ReactNode } from 'react';

export function WeatherShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.page)}>
      <a href="#forecast" {...stylex.props(styles.skip)}>
        Skip to forecast
      </a>
      <header {...stylex.props(styles.header)}>
        <a href="/" {...stylex.props(styles.brand)} aria-label="Tempo home">
          <CloudSun size={30} strokeWidth={1.6} />
          <span>
            tempo<span {...stylex.props(styles.dot)}>.</span>
          </span>
        </a>
        <span {...stylex.props(styles.headerNote)}>
          A little perspective on the days ahead.
        </span>
        <a href="https://www.ipma.pt/en/" {...stylex.props(styles.source)}>
          Weather by IPMA <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </header>
      <div {...stylex.props(styles.layout)}>
        {sidebar}
        <main id="forecast" {...stylex.props(styles.content)}>
          {children}
        </main>
      </div>
      <footer {...stylex.props(styles.footer)}>
        <span>Made for whatever the weather brings.</span>
        <span>
          Portugal, at a glance <span aria-hidden="true">↗</span>
        </span>
      </footer>
    </div>
  );
}

export function WeatherLoading() {
  return (
    <section {...stylex.props(styles.loading)} aria-busy="true">
      <p {...stylex.props(styles.eyebrow)}>PORTUGAL / WEATHER</p>
      <h1 {...stylex.props(styles.title)}>Looking at the skies.</h1>
      <p>Loading the forecast from IPMA…</p>
    </section>
  );
}

const styles = stylex.create({
  layout: {
    display: 'grid',
    gridTemplateColumns: {
      default: '230px minmax(0, 1fr)',
      '@media (max-width: 900px)': '190px minmax(0, 1fr)',
      '@media (max-width: 700px)': '1fr',
    },
    gap: { default: 54, '@media (max-width: 1100px)': 30 },
    paddingBlock: { default: 44, '@media (max-width: 700px)': 28 },
  },
  content: { minWidth: 0 },
  page: {
    color: '#192e32',
    maxWidth: 1480,
    marginInline: 'auto',
    paddingInline: {
      default: 48,
      '@media (max-width: 900px)': 24,
      '@media (max-width: 500px)': 18,
    },
  },
  header: {
    minHeight: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#d9ded7',
  },
  brand: {
    display: 'inline-flex',
    gap: 12,
    alignItems: 'center',
    fontSize: 34,
    letterSpacing: '-1.8px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  dot: { color: '#658b48' },
  headerNote: {
    color: '#667772',
    fontSize: 13,
    display: { default: 'block', '@media (max-width: 780px)': 'none' },
  },
  source: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    textDecoration: 'none',
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    paddingBlock: 26,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#d9ded7',
    color: '#697b73',
    fontSize: 12,
  },
  skip: {
    position: 'absolute',
    top: -100,
    left: 24,
    padding: 12,
    backgroundColor: '#d9f2a5',
    zIndex: 100,
    ':focus': { top: 8 },
  },
  loading: { minHeight: 650, paddingBlock: 72 },
  eyebrow: {
    letterSpacing: '2px',
    fontSize: 11,
    fontWeight: 700,
    color: '#65796e',
  },
  title: { fontSize: 44, letterSpacing: '-2px', marginBlock: 20 },
});
