import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage', 'design']);
const readable = new Set(['.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.css', '.html', '.yml', '.yaml']);
const checks = [
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'authorization bearer value', pattern: /authorization\s*[:=]\s*["']?bearer\s+[a-z0-9._-]{12,}/i },
  { label: 'common live API key', pattern: /\b(?:sk-[a-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,})\b/i },
];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (readable.has(extname(entry.name)) || entry.name.startsWith('.env')) files.push(path);
  }
  return files;
}

const findings = [];
for (const path of await filesIn(root)) {
  const content = await readFile(path, 'utf8');
  for (const check of checks) {
    if (check.pattern.test(content)) findings.push(`${relative(root.pathname, path)}: ${check.label}`);
  }
}

if (findings.length) {
  console.error(`Potential secrets found:\n${findings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Secret scan passed: no credential-shaped values found in tracked project sources.');
}
