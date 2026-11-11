import 'server-only';
import { createClient } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { ProxyService } from './gen/ipma/proxy/v1/proxy_pb';

const baseUrl = process.env.IPMA_GRPC_URL ?? 'http://127.0.0.1:50051';

function appendGrpcWebTrailer(body: Uint8Array, status: string) {
  const trailer = new TextEncoder().encode(`grpc-status: ${status}\r\n`);
  const frame = new Uint8Array(5 + trailer.length);
  frame[0] = 0x80;
  new DataView(frame.buffer).setUint32(1, trailer.length);
  frame.set(trailer, 5);
  const output = new Uint8Array(body.length + frame.length);
  output.set(body);
  output.set(frame, body.length);
  return output;
}

function createWorkersTransport() {
  return createGrpcWebTransport({
    baseUrl,
    defaultTimeoutMs: 20_000,
    fetch: async (input, init) => {
      // Workers does not expose HTTP trailers through fetch. The gateway accepts
      // the gRPC-Web request headers, so translate its normal gRPC response into
      // the gRPC-Web body format expected by the fetch transport.
      const response = await fetch(input, { ...init, redirect: 'manual' });
      const body = new Uint8Array(await response.arrayBuffer());
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('transfer-encoding');
      headers.delete('grpc-status');
      headers.delete('grpc-message');
      const status = response.ok && body.byteLength > 0 ? '0' : '14';
      return new Response(appendGrpcWebTrailer(body, status), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  });
}

const isCloudflareWorkers =
  globalThis.navigator?.userAgent === 'Cloudflare-Workers';

// Neither transport nor generated protobuf descriptors cross the RSC boundary.
export const grpc = createClient(
  ProxyService,
  isCloudflareWorkers
    ? createWorkersTransport()
    : createGrpcTransport({ baseUrl, defaultTimeoutMs: 20_000 }),
);
