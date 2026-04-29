const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd) {
  try {
    return String(execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })).trim();
  } catch {
    return '';
  }
}

function formatLocalStamp(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

const repoCommit = run('git rev-parse --short HEAD') || 'unknown';
const now = new Date();
const payload = {
  commit: repoCommit,
  builtAtIso: now.toISOString(),
  builtAtLocal: formatLocalStamp(now),
  stamp: `${repoCommit}  ·  ${formatLocalStamp(now)}`,
};

const outPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`[version] wrote ${outPath}: ${payload.stamp}`);
