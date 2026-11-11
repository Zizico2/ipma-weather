import withStylex from '@stylexswc/nextjs-plugin/turbopack';
import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  serverExternalPackages: ['@connectrpc/connect-node'],
  turbopack: { root: process.cwd() },
};

export default withStylex({
  rsOptions: {
    dev: process.env.NODE_ENV === 'development',
    unstable_moduleResolution: { type: 'commonJS' },
  },
})(config);
