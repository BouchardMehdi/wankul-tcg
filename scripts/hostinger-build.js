const { copyFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const requiredFiles = ['src/main.ts', 'src/app.module.ts', 'public/index.html'];

console.log('[hostinger-build] Checking project structure...');

for (const file of requiredFiles) {
  const absolutePath = join(root, file);

  if (!existsSync(absolutePath)) {
    console.error(`[hostinger-build] Missing required file: ${file}`);
    process.exit(1);
  }
}

console.log('[hostinger-build] Source files found.');
console.log('[hostinger-build] Running NestJS build...');

const result = spawnSync(
  process.execPath,
  ['./node_modules/@nestjs/cli/bin/nest.js', 'build'],
  {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1024',
    },
    stdio: 'inherit',
  },
);

if (result.status !== 0) {
  console.error(`[hostinger-build] NestJS build failed with code ${result.status}.`);
  process.exit(result.status || 1);
}

if (!existsSync(join(root, 'dist/main.js'))) {
  console.error('[hostinger-build] Build finished but dist/main.js was not created.');
  process.exit(1);
}

const cardsSource = join(root, 'data', 'cards.json');
const cardsTargetDir = join(root, 'dist', 'data');
const cardsTarget = join(cardsTargetDir, 'cards.json');

if (!existsSync(cardsSource)) {
  console.error('[hostinger-build] Missing required file: data/cards.json');
  process.exit(1);
}

mkdirSync(cardsTargetDir, { recursive: true });
copyFileSync(cardsSource, cardsTarget);
console.log('[hostinger-build] Copied data/cards.json to dist/data/cards.json.');

console.log('[hostinger-build] Build completed successfully.');
