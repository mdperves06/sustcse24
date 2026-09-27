import { execSync } from "node:child_process";
import { config } from "dotenv";

/** Applies migrations to the dedicated test database before the suite runs. */
export default function setup() {
  config();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL (a separate, disposable database) to run the tests.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL — tests wipe the database.");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
