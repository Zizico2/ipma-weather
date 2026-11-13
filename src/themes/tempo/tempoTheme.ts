import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

// Extend Astryx's complete component and icon system; own only Tempo's look.
export const tempoTheme = defineTheme({
  name: 'tempo',
  extends: neutralTheme,
  localTokens: {
    '--tempo-weather-glow':
      'radial-gradient(ellipse at top right, #49675b 0%, transparent 65%)',
    '--tempo-weather-sky-color': '#f4e8ab',
    '--tempo-weather-orbits':
      'radial-gradient(circle at center, #f4e8ab18 0%, #f4e8ab08 48%, transparent 49%), radial-gradient(circle at center, transparent 65%, #c6d8bd26 66%, transparent 67%)',
    '--tempo-weather-icon-forecast': '2rem',
    '--tempo-weather-icon-hero': '7rem',
    '--tempo-hour-width': '5.5rem',
    '--tempo-hour-line': 'light-dark(#a86d20, #e9bd68)',
    '--tempo-hour-fill': 'light-dark(#edc36b30, #edc36b18)',
    '--tempo-hour-rain': 'light-dark(#3c7188, #99cddd)',
  },
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: 'Arial', fallbacks: 'Helvetica, sans-serif' },
    heading: {
      family: 'Arial',
      fallbacks: 'Helvetica, sans-serif',
      weight: 'medium',
    },
  },
  tokens: {
    '--color-background-body': ['#f5f5f0', '#162623'],
    '--color-background-surface': ['#f5f5f0', '#192e2a'],
    '--color-background-card': ['#f9faf5', '#203b34'],
    '--color-background-popover': ['#f9faf5', '#203b34'],
    '--color-background-muted': ['#e8ebe3', '#2c453a'],
    '--color-text-primary': ['#192e32', '#edf2e4'],
    '--color-text-secondary': ['#607168', '#b5c8bc'],
    '--color-accent': ['#41624c', '#bad39b'],
    '--color-accent-muted': ['#e4ebd6', '#37533f'],
    '--color-text-accent': ['#345b3f', '#c2dfa6'],
    '--color-icon-accent': ['#41624c', '#bad39b'],
    '--color-icon-primary': ['#263d34', '#edf2e4'],
    '--color-icon-secondary': ['#5e7969', '#b5c8bc'],
    '--color-on-accent': ['#ffffff', '#192e23'],
    '--color-border': ['#d9ded7', '#385348'],
    '--color-border-emphasized': ['#bacb9b', '#718a65'],
    '--color-overlay-hover': ['#243a2a0a', '#e4efd70d'],
    '--color-overlay-pressed': ['#243a2a14', '#e4efd71a'],
    '--color-skeleton': ['#e4e9dd', '#37533f'],
    '--focus-outline-color': ['#41624c', '#c2dfa6'],
    '--radius-container': '16px',
    '--radius-element': '10px',
    '--text-display-2-size': 'clamp(2.5rem, 4vw, 3.25rem)',
  },
  components: {
    card: {
      base: { padding: 'var(--spacing-4)' },
      'variant:weather': {
        backgroundColor: '#203b40',
        color: '#f9faf5',
        borderColor: '#203b40',
        '--color-text-primary': '#f9faf5',
        '--color-text-secondary': '#c8d7d5',
        '--color-background-gray': '#ffffff14',
        '--color-text-gray': '#e4efd7',
        '--text-display-1-size': 'clamp(4rem, 7vw, 5.625rem)',
      },
      'variant:forecast-selected': {
        backgroundColor: 'light-dark(#e4edce, #37533f)',
        borderColor: 'var(--color-border-emphasized)',
      },
    },
    'selectable-card': {
      'variant:forecast-selected': {
        '--selectable-card-ring-color': 'transparent',
      },
    },
    'side-nav-item': {
      selected: {
        backgroundColor: 'var(--color-accent-muted)',
        color: 'var(--color-text-accent)',
      },
    },
    heading: {
      'type:display-2': { letterSpacing: '-0.045em' },
    },
    'segmented-control': {
      base: { borderRadius: '9999px' },
    },
    'segmented-control-item': {
      base: { borderRadius: '9999px' },
    },
  },
});
