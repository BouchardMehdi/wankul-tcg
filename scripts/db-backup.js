const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { loadEnvFile, requireDbEnv, timestamp } = require('./env-utils');

loadEnvFile();

const db = requireDbEnv();
const backupsDir = path.resolve(process.env.DB_BACKUP_DIR || path.join(process.cwd(), 'backups'));
fs.mkdirSync(backupsDir, { recursive: true });

const outputPath = path.join(backupsDir, `${db.database}-${timestamp()}.sql`);
const output = fs.createWriteStream(outputPath, { flags: 'wx' });

const args = [
  `--host=${db.host}`,
  `--port=${db.port}`,
  `--user=${db.user}`,
  '--single-transaction',
  '--quick',
  '--routines',
  '--triggers',
  '--default-character-set=utf8mb4',
  db.database,
];

const child = spawn(process.env.MYSQLDUMP_BIN || 'mysqldump', args, {
  env: {
    ...process.env,
    MYSQL_PWD: db.password,
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});

child.stdout.pipe(output);

child.on('error', (error) => {
  output.close();
  fs.rmSync(outputPath, { force: true });
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});

child.on('close', (code) => {
  output.close();

  if (code !== 0) {
    fs.rmSync(outputPath, { force: true });
    console.error(`Backup failed with exit code ${code}.`);
    process.exit(code || 1);
  }

  console.log(`Database backup created: ${outputPath}`);
});
