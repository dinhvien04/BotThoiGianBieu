#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_TABLE = "bot_schema_migrations";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function sslConfig() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_SSL === "1" ||
    (nodeEnv === "production" && process.env.DATABASE_SSL !== "false");
  const strict =
    process.env.DATABASE_SSL_STRICT ??
    (nodeEnv === "production" ? "true" : "false");

  return sslEnabled
    ? { rejectUnauthorized: strict !== "false" && strict !== "0" }
    : false;
}

async function main() {
  const botRoot = path.resolve(__dirname, "..");
  const repoRoot = path.resolve(botRoot, "..", "..");
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(botRoot, ".env"));

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  const migrationsDir = path.join(botRoot, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{3}-.*\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslConfig(),
  });

  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      MIGRATIONS_TABLE,
    ]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      const existing = await client.query(
        `SELECT checksum FROM ${MIGRATIONS_TABLE} WHERE id = $1`,
        [file],
      );

      if (existing.rowCount > 0) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(
            `Migration ${file} was already applied with a different checksum`,
          );
        }
        console.log(`skip ${file}`);
        continue;
      }

      console.log(`apply ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (id, checksum) VALUES ($1, $2)`,
          [file, checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
      MIGRATIONS_TABLE,
    ]);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
