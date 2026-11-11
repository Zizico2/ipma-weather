import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function check(directory: string): Promise<number> {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += await check(path);
    else if (entry.name.endsWith('.js')) {
      const source = await readFile(path, 'utf8');
      if (
        /ipma\.proxy\.v1|createGrpcTransport|@connectrpc\/connect-node|node:http2|GetWeatherForecastRequest|Invalid location ID|Weather backend request failed/.test(
          source,
        )
      ) {
        throw new Error(`Server-only code found in browser asset: ${path}`);
      }
      count++;
    }
  }
  return count;
}

console.log(
  `Checked ${await check('.next/static')} browser JavaScript assets: no gRPC runtime or server routes.`,
);
