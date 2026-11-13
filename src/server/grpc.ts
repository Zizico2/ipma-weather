import 'server-only';
import { createClient } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import { ProxyService } from './gen/ipma/proxy/v1/proxy_pb';

// Native HTTP/2 stays on the Node server; only weather DTOs reach the browser.
export const grpc = createClient(
  ProxyService,
  createGrpcTransport({
    baseUrl: process.env.IPMA_GRPC_URL ?? 'http://127.0.0.1:50051',
    defaultTimeoutMs: 20_000,
  }),
);
