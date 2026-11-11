export default {
  plugins: {
    '@stylexswc/postcss-plugin': {
      include: ['src/**/*.{ts,tsx}'],
      rsOptions: {
        dev: process.env.NODE_ENV === 'development',
        unstable_moduleResolution: { type: 'commonJS' },
      },
    },
  },
};
