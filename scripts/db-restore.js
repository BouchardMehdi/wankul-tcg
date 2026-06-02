const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { loadEnvFile, requireDbEnv } = require('./env-utils');

loadEnvFile();

if (process.env.ALLOW_DB_RESTORE !== 'YES') {
  console.error('Restore refused. Set ALLOW_DB_RESTORE=YES to confirm this manual rollback.');
  process.exit(1);
}

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: ALLOW_DB_RESTORE=YES npm run db:restore -- ./backups/file.sql');
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
  console.error(`Restore file not found: ${inputPath}`);
  process.exit(1);
}

const db = requireDbEnv();
const input = fs.createReadStream(inputPath);

const args = [
  `--host=${db.host}`,
  `--port=${db.port}`,
  `--user=${db.user}`,
  '--default-character-set=utf8mb4',
  db.database,
];

const child = spawn(process.env.MYSQL_BIN || 'mysql', args, {
  env: {
    ...process.env,
    MYSQL_PWD: db.password,
  },
  stdio: ['pipe', 'inherit', 'inherit'],
});

input.pipe(child.stdin);

child.on('error', (error) => {
  console.error(`Restore failed: ${error.message}`);
  process.exitCode = 1;
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Restore failed with exit code ${code}.`);
    process.exit(code || 1);
  }

  console.log(`Database restored from: ${inputPath}`);
});
