import { spawnSync } from 'child_process';

const result = spawnSync('buf', ['generate'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
