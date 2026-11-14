import withStylex from '@stylexswc/nextjs-plugin/turbopack';
import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactCompiler: true,
  transpilePackages: ['astryx-fork'],
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  serverExternalPackages: ['@connectrpc/connect-node'],
  turbopack: { root: process.cwd() },
  experimental: {
    // City routes render at request time. Retain completed visits for the same
    // five minutes as the forecast cache instead of discarding them on a link click.
    staleTimes: { dynamic: 300 },
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === '1',
  },
};

export default withStylex({
  rsOptions: {
    dev: process.env.NODE_ENV === 'development',
    unstable_moduleResolution: { type: 'commonJS' },
  },
})(config);
