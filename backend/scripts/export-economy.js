const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const { loadEnvFile, requireDbEnv, timestamp } = require('./env-utils');

loadEnvFile();

function numberArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const value = Number(raw.split('=').slice(1).join('='));
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  const db = requireDbEnv();
  const days = Math.min(180, Math.max(1, numberArg('days', 30)));
  const outputDir = path.resolve(process.env.DB_BACKUP_DIR || path.join(process.cwd(), 'backups'));
  fs.mkdirSync(outputDir, { recursive: true });

  const connection = await mysql.createConnection({
    host: db.host,
    port: Number(db.port),
    user: db.user,
    password: db.password,
    database: db.database,
    charset: 'utf8mb4',
  });

  const [dailyRows] = await connection.execute(
    `
      SELECT *
      FROM economy_daily_stats
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY date DESC
    `,
    [days],
  );

  const [logRows] = await connection.execute(
    `
      SELECT *
      FROM economic_action_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at DESC
      LIMIT 250
    `,
    [days],
  );

  const [transactionRows] = await connection.execute(
    `
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(total_price_credits), 0) AS volume,
        COALESCE(AVG(unit_price_credits), 0) AS averageUnitPrice
      FROM market_transactions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `,
    [days],
  );

  await connection.end();

  const output = {
    exportedAt: new Date().toISOString(),
    database: db.database,
    days,
    dailyStats: dailyRows,
    economicActionLogs: logRows,
    marketTransactionsSummary: transactionRows[0] || null,
  };

  const outputPath = path.join(outputDir, `economy-export-${timestamp()}-${days}d.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Economy export created: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
