import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

function getFilesToScan() {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const tracked = execSync('git ls-files', { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    return Array.from(new Set([...staged, ...tracked]));
  } catch {
    return [];
  }
}

const forbiddenPathPatterns = [
  /(^|\/)\.env(\..+)?$/,
  /(^|\/)uploads\//,
  /(^|\/)node_modules\//,
  /(^|\/)backend\/storage(\/|$)/,
];

const files = getFilesToScan();
const errors = [];

for (const file of files) {
  if (file === '.env.example' || file.endsWith('/.env.example')) {
    // Allowed template file, still check values below
  } else {
    for (const pattern of forbiddenPathPatterns) {
      if (pattern.test(file)) {
        errors.push(`Forbidden tracked/staged path detected: ${file}`);
      }
    }
  }

  if (!existsSync(file)) continue;
  let content = '';
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const skPrefix = 'sk-' + 'ant-';
  if (
    file !== 'scripts/scan-secrets.mjs' &&
    file !== 'scripts/check-and-push.sh' &&
    content.includes(skPrefix)
  ) {
    errors.push(`Anthropic secret prefix (${skPrefix}*) found in ${file}`);
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(
      /^(ANTHROPIC_API_KEY|JWT_SECRET|ENCRYPTION_KEY)\s*=\s*(.+)$/
    );
    if (match) {
      const key = match[1];
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (val.length > 0) {
        errors.push(
          `Non-empty secret assignment for ${key} in ${file}:${i + 1}`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Secret scan FAILED:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked/staged files checked).`);

