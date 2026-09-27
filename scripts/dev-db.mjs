// Local development PostgreSQL (no Docker required).
// Starts an embedded PostgreSQL server using the `embedded-postgres` package and
// keeps it running until you press Ctrl+C. Data lives in ./.data/postgres.
// In production, point DATABASE_URL at a managed PostgreSQL instance instead.
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";

const port = Number(process.env.DEV_DB_PORT ?? 5433);
const databaseDir = path.resolve(".data/postgres");
const isNew = !fs.existsSync(path.join(databaseDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "cse24",
  password: "cse24_dev_password",
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

if (isNew) {
  console.log("Initialising new local PostgreSQL cluster…");
  await pg.initialise();
}
await pg.start();

for (const name of ["cse24", "cse24_test"]) {
  try {
    await pg.createDatabase(name);
    console.log(`Created database "${name}"`);
  } catch {
    // already exists
  }
}

console.log(`\nLocal PostgreSQL running on postgresql://cse24:***@localhost:${port}`);
console.log("Press Ctrl+C to stop.\n");

const shutdown = async () => {
  console.log("\nStopping PostgreSQL…");
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
