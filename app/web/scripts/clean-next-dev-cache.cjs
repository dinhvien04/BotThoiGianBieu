const { rmSync } = require('node:fs');
const { join } = require('node:path');

try {
  rmSync(join(process.cwd(), '.next', 'dev', 'types'), { recursive: true, force: true });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Could not clean Next dev type cache: ${message}`);
}
