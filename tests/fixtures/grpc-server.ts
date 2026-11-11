import { createServer } from 'node:http2';
import { Code, ConnectError } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { ProxyService } from '../../src/server/gen/ipma/proxy/v1/proxy_pb';
import { fixtureForecast, locations } from './data';

const server = createServer(
  connectNodeAdapter({
    routes(router) {
      router.service(ProxyService, {
        ping: () => ({ message: 'fixture ready' }),
        getLocations: () => ({ locations }),
        getCodeTable: () => ({
          entries: [
            { code: 1, descriptionEnglish: 'Clear sky' },
            { code: 7, descriptionEnglish: 'Light showers/rain' },
          ],
        }),
        getWeatherForecast: (request) => {
          if (request.target.case !== 'locationId')
            throw new ConnectError('Location required', Code.InvalidArgument);
          if (request.target.value === 1030300)
            throw new ConnectError('Fixture unavailable', Code.Unavailable);
          return fixtureForecast(request.target.value);
        },
      });
    },
  }),
);
server.listen(50061, '127.0.0.1', () =>
  console.log('gRPC fixture ready at 127.0.0.1:50061'),
);
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
