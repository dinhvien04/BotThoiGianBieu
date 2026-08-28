#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_TABLE = "bot_schema_migrations";

const LEGACY_CHECKSUM_TRANSITIONS = {
  // Explicit mapping of approved historical/legacy checksum -> approved current replacement checksum
  "001-init-base-schema.sql": {
    // Legacy hash with embedded BEGIN/COMMIT (LF and CRLF)
    "0e91da5a1b32d2077e68bc92d0ff1dbfc03d1ee31f137ebce1f422e1caecae54":
      "9f266a18d85bfff2aea80d960d598f4bd3919f3a27641525dbe63ce85b49b08b",
    "55485144bfe41d7d0afbe185f22d29fc897de951aa1d1682260e2b658b07fa5c":
      "9f266a18d85bfff2aea80d960d598f4bd3919f3a27641525dbe63ce85b49b08b",
  },
  "014-drop-unrelated-shared-db-tables.sql": {
    // Legacy hashes with embedded BEGIN/COMMIT, previous schedule_editors drop, and comment revisions
    "e9d8cb4081c708170c0c7743d5c90714ee67bebf2ff1e15e8d89e5a88e994e43":
      "60263aa96a934df82b2ff432891d07715e2ff7072379c83eed78e77195d61600",
    "b8cfc54efdae55aa1a5bba6614138e65c093aee86c35c345ca033d5966699eb3":
      "60263aa96a934df82b2ff432891d07715e2ff7072379c83eed78e77195d61600",
    "5d70f98fb7fe16cebbd9dd3a0da4e5bfa780d60c41fc86a5df9c017d8481308a":
      "60263aa96a934df82b2ff432891d07715e2ff7072379c83eed78e77195d61600",
    "f266bedbd775a506165c15e245805266184f688bb12f8aa28c660fbdda41eacf":
      "60263aa96a934df82b2ff432891d07715e2ff7072379c83eed78e77195d61600",
    "50871c522f70aa1fa60a1dc279fee5befffa008285e3f1a348109a5889583c12":
      "60263aa96a934df82b2ff432891d07715e2ff7072379c83eed78e77195d61600",
    "5c422160fa53e8dc1550635e44dba24cb9bd30d2d61ce250467664d9177f840f":
      "60263aa96a934df82b2ff432891d07715e2ff7072379c83eed78e77195d61600",
  },
  "021-add-performance-indexes.sql": {
    // Legacy hash with embedded BEGIN/COMMIT
    "b1bf47ee455e96a4dc372f7dbda360155b4b1a43a04a3f3a8b2dfa4f009efb46":
      "76334be2769b32c2249194dc8d50a333b571df4597e83dd20b8c29f1c9a7543d",
    "1c302272ff3823d11841c5a8165c6f68ffb5eee3602b10393038af58959d6885":
      "76334be2769b32c2249194dc8d50a333b571df4597e83dd20b8c29f1c9a7543d",
  },
};

function resolveMigrationChecksumAction(file, fileChecksum, recordedChecksum) {
  if (recordedChecksum === null || recordedChecksum === undefined) {
    return { action: "apply" };
  }

  if (recordedChecksum === fileChecksum) {
    return { action: "skip" };
  }

  const allowedCurrentChecksum =
    LEGACY_CHECKSUM_TRANSITIONS[file]?.[recordedChecksum];

  if (allowedCurrentChecksum === fileChecksum) {
    return { action: "normalize" };
  }

  throw new Error(
    `Migration ${file} was already applied with a different checksum`,
  );
}

async function normalizeMigrationChecksum(client, file, checksum) {
  await client.query("BEGIN");
  try {
    await client.query(
      `UPDATE ${MIGRATIONS_TABLE} SET checksum = $1 WHERE id = $2`,
      [checksum, file],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function applyMigration(client, file, sql, checksum) {
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

      const recordedChecksum =
        existing.rowCount > 0 ? existing.rows[0].checksum : null;

      const { action } = resolveMigrationChecksumAction(
        file,
        checksum,
        recordedChecksum,
      );

      if (action === "skip") {
        console.log(`skip ${file}`);
        continue;
      }

      if (action === "normalize") {
        console.log(`normalizing checksum for ${file}`);
        await normalizeMigrationChecksum(client, file, checksum);
        console.log(`skip ${file}`);
        continue;
      }

      if (action === "apply") {
        console.log(`apply ${file}`);
        await applyMigration(client, file, sql, checksum);
      }
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
        MIGRATIONS_TABLE,
      ]);
    } catch {
      // Ignore unlock failure on closed/errored connection
    }
    await client.end();
  }
}

module.exports = {
  MIGRATIONS_TABLE,
  LEGACY_CHECKSUM_TRANSITIONS,
  resolveMigrationChecksumAction,
  normalizeMigrationChecksum,
  applyMigration,
  sslConfig,
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
